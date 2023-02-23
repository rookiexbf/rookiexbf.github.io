# computed 计算属性

::: tip 思考时间
在Vue中，我们对计算属性的使用应该不会陌生，它可以帮我们缓存表达式的值避免重复的计算，那么它是如何做到的呢？
:::

## 响应式更新

在这之前我们需要大概了解Vue的响应式系统，以及它是如何工作的。那么我们需要知道一个概念就是当我们修改一个组件的响应式数据时，对应的视图也会随之更新，这是由于在生成vdom的时候读取到了响应式数据，从而触发了响应式系统依赖收集的机制，将响应式数据和视图关联起来。

## 代码分析

我们先来看看`computed`是如何工作的，这里截取部分代码。

```ts

function Vue(options) {
  if (__DEV__ && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

 Vue.prototype._init = function (options?: Record<string, any>) {
    // 省略
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate', undefined, false )
    initInjections(vm) 
    initState(vm)   //这里是关于computed初始化的入口
    initProvide(vm) 
    callHook(vm, 'created')
    // 省略
}

export function initState(vm: Component) {
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)

  initSetup(vm)

  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    initData(vm)
  } else {
    const ob = observe((vm._data = {}))
    ob && ob.vmCount++
  }
  if (opts.computed) initComputed(vm, opts.computed) // 可以看到这里就是我们computed的运行逻辑
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

```

好了，现在我们知道是在创建一个Vue实例的时候会进行相应的初始化的操作,这个实例其实就是我们Vue中的组件。

```ts
const computedWatcherOptions = { lazy: true }
function initComputed(vm: Component, computed: Object) {
  const watchers = (vm._computedWatchers = Object.create(null))
  // ...
  for (const key in computed) {
    const userDef = computed[key]
    const getter = isFunction(userDef) ? userDef : userDef.get
    // ...
    if (!isSSR) {
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }
    if (!(key in vm)) {
      defineComputed(vm, key, userDef) //定义计算属性的get
    } else if (__DEV__) {
        if (key in vm.$data) {
            warn(`The computed property "${key}" is already defined in data.`, vm)
        } else if (vm.$options.props && key in vm.$options.props) {
            warn(`The computed property "${key}" is already defined as a prop.`, vm)
        } else if (vm.$options.methods && key in vm.$options.methods) {
            warn(
            `The computed property "${key}" is already defined as a method.`,
            vm
            )
        }
    }
  }
}
```

从上面可以看到我们遍历了options中的computed属性，这个options就是创建一个Vue组件时传入的参数包括data,computed,watch等等。这里我们为每一个计算属性都生成了一个`Watcher`对象并且保存在vm._computedWatchers上。接着遍历vm的属性走到`defineComputed`。上面有一点需要注意就是
```ts 
const computedWatcherOptions = { lazy: true }
```
这是将计算属性对应的watcher和其他的watcher区别开来的地方。


```ts
export function defineComputed(
  target: any,
  key: string,
  userDef: Record<string, any> | (() => any)
) {
  const shouldCache = !isServerRendering()
  if (isFunction(userDef)) {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  // ...
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

这里的`defineComputed` 其实将实例化Vue组件时传入的computed选项中的所有属性代理到vm上。并且兼容了Function和
```ts
{
    get(){},
    set(){}
}
```
的形式。


```ts
function createComputedGetter(key) {
  return function computedGetter() {
    // 读取computed中的属性
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      // 此次分析无关，等分析响应式的时候会聊到
      if (Dep.target) {
        if (__DEV__ && Dep.target.onTrack) {
          Dep.target.onTrack({
            effect: Dep.target,
            target: this,
            type: TrackOpTypes.GET,
            key
          })
        }
        watcher.depend()
      }
      return watcher.value
    }
  }
}
```

所以每当我们读取computed中的属性时实际就会走到 `Object.defineProperty(target, key, sharedPropertyDefinition)`，也就是我们的computedGetter方法中。这里我们看到有个 `watcher.dirty` 属性。

``` ts
// ...
const computedWatcherOptions = { lazy: true }
// ...
const watchers = (vm._computedWatchers = Object.create(null));
// ...
watchers[key] = new Watcher(
    vm,
    getter || noop,
    noop,
    computedWatcherOptions
)
```

回顾一下之前创建watchers时的参数。因为计算属性`watcher.dirty=true`，所以执行`watcher.evaluate()`。

``` ts
// Watcher中和计算属性相关
export default class Watcher implements DepTarget {
  // ...
  lazy: boolean
  dirty: boolean
  // ...
  constructor(
    vm: Component | null,
    expOrFn: string | (() => any),
    cb: Function,
    options?: WatcherOptions | null,
    isRenderWatcher?: boolean
  ) {
    // ...    
    this.dirty = this.lazy // for lazy watchers
    // ...
     if (isFunction(expOrFn)) {
    
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        // ...
      }
    }
    this.value = this.lazy ? undefined : this.get()
  }

// 读取计算属性实际所执行的操作
  get() {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 这里就是读取计算属性实际所执行的操作，getter就是上面的expOrFn，可以理解为执行computed对应的表达式。
      value = this.getter.call(vm, vm)
    } catch (e: any) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  evaluate() {
    this.value = this.get()
    this.dirty = false
  }
}

```

上述代码执行顺序 evaluate=>get=>getter 实际最后执行的就是我们对应的computed[key]。执行玩之后`this.dirty = false`。所以当计算属性中的依赖没有变化的时候直接返回当前的value值，实现缓存。

