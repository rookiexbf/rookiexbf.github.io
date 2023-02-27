# ref 原理分析

在Vue2中，我们的响应式数据定义在 `data` 选项中，通过 `Object.defineProperty` 去循环的递归我们 `data`返回的对象 ，达到监听数据变更的目的。了解Vue3的小伙伴们都知道Vue3的底层的响应式实现由 `Object.defineProperty` 更换成了 `Proxy`。

::: tip 那么为什么Vue3要这么做呢？`Proxy`相对于`Object.defineProperty`有什么优势？
:::

因为这块不是我们要讨论的内容，这边我做个小小的总结然后开始正文吧:
* 首先是`Object.defineProperty` api本身的限制，在`Object.defineProperty` 初始化代理对象之后，其上新增的字段无法检测变动。
* 其次出于性能的考虑Vue2中并没有对数组实现完全的响应式监听，所以导致在Vue2中通过数组索引的方式去修改一个选项的时候无法做出响应，但是Vue2通过重写数组原型上的方法实现对数组的响应式监听。


## ref如何做到响应式？

`ref`、`reactive` 作为Vue3响应式的核心，我们有必要去了解它是如何工作的。本篇我们先来分析`ref`：
```ts

// ref的定义
export function ref<T extends object>(
  value: T
): [T] extends [Ref] ? T : Ref<UnwrapRef<T>>
export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
  return createRef(value, false)
} 
// ....
// 判断参数是否是已经是ref类型的值，是的话直接返回。否则创建一个ref对象
function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}
// ...
// 拦截value的存取行为，做对应的处理。__v_isShallow==false
class RefImpl<T> {
  private _value: T
  private _rawValue: T

  public dep?: Dep = undefined
  public readonly __v_isRef = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value)
    this._value = __v_isShallow ? value : toReactive(value)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
    newVal = useDirectValue ? newVal : toRaw(newVal)
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = useDirectValue ? newVal : toReactive(newVal)
      triggerRefValue(this, newVal)
    }
  }
}

// 判断参数是否是对象，是的话调用reactive处理
export const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value) : value
```

前面应该都好理解，就是当我们调用ref(value)的时候，返回一个RefImpl对象。这个对象拦截我们存取当前对象value属性的操作。那么当我们对当前对象的value值进行操作的时候会发生什么呢？这里我们主要看这两块代码：
```ts
//判断当前是否有正在活跃的activeEffect，并且判断是否需要收集依赖。
export function trackRefValue(ref: RefBase<any>) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref)
    if (__DEV__) {
      trackEffects(ref.dep || (ref.dep = createDep()), {
        target: ref,
        type: TrackOpTypes.GET,
        key: 'value'
      })
    } else {
      trackEffects(ref.dep || (ref.dep = createDep()))
    }
  }
}

// ...
// 依赖收集
export function trackEffects(
  dep: Dep,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {

  let shouldTrack = false
  if (effectTrackDepth <= maxMarkerBits) {
    if (!newTracked(dep)) {
      dep.n |= trackOpBit 
      shouldTrack = !wasTracked(dep)
    }
  } else {
    shouldTrack = !dep.has(activeEffect!)
  }

  if (shouldTrack) {
    // dep和activeEffect互相收集
    dep.add(activeEffect!)
    activeEffect!.deps.push(dep)
    if (__DEV__ && activeEffect!.onTrack) {
      activeEffect!.onTrack({
        effect: activeEffect!,
        ...debuggerEventExtraInfo!
      })
    }
  }
}
// 依赖更新，通知Effects
export function triggerRefValue(ref: RefBase<any>, newVal?: any) {
  ref = toRaw(ref)
  if (ref.dep) {
    if (__DEV__) {
      triggerEffects(ref.dep, {
        target: ref,
        type: TriggerOpTypes.SET,
        key: 'value',
        newValue: newVal
      })
    } else {
      triggerEffects(ref.dep)
    }
  }
}


// 遍历dep，通知其中所有依赖当前ref的effect去更新操作
export function triggerEffects(
  dep: Dep | ReactiveEffect[],
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
}

// 去执行effect中的副作用
function triggerEffect(
  effect: ReactiveEffect,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (__DEV__ && effect.onTrigger) {
      effect.onTrigger(extend({ effect }, debuggerEventExtraInfo))
    }
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}
```

看到这里了解Vue2中响应式原理的小伙伴们是不是突然感觉很熟悉了，这里就是Vue3中收集依赖的过程。代码给出部分注释而忽略其中的部分细节，目的是为了让大家对整个流程更加明确。
我们来理一理依赖收集的过程，首先当我们读取ref.value时，依赖收集的路径就是这样的`trackRefValue`->`trackEffects`->`dep.add()`。当我们改变了ref.value时，我们去通知到对应的effect:`triggerRefValue`->`triggerEffects`->`triggerEffect`->`effect.run()`。本质上还是一个依赖收集的过程，通过ref.dep去收集当前正在执行的activeEffect依赖，然后再ref.value被改变时去通知Effect执行对应的操作。

看到这里是不是点奇怪，说好的`Proxy`呢？情况是这样的，`Proxy`无法处理原始值。所以ref通过创建一个对象并且拦截对象上的value属性，实现对原始值的响应式监听。如果ref的参数为一个对象的话，其内部会调用`reactive`去处理，但是Vue3中还是推荐用`ref`去处理原始值。

