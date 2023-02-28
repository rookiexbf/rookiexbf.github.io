# reactive 源码分析

在 `ref` 源码分析中我们讲述了Vue3如何实现响应式。`reactive`中也是类似的依赖收集的过程，所以我们这次主要来看 `reactive` 内部是对参数进行处理的。

## reactive 实现
```ts
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
export function reactive(target: object) {
  if (isReadonly(target)) {
    return target
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}

// ...
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
// 参数不是对象，直接返回，不做处理
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
// 参数已经是一个Proxy对象并且不是只读的，直接返回
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
// 参数已经被代理过了，直接返回缓存中的代理对象
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  // 只有特定的类型的值能被观察到，直接返回
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  // 为参数对象创建一个代理，并缓存。区分一些特殊对象的如Set 、 Map 、 WeakMap 、 WeakSet的代理操作（暂时不讨论）
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  proxyMap.set(target, proxy)
  return proxy
}

```

可以看到上面大部分代码都是对参数做一些限定和边界处理，最终我们为参数对象创建一个Proxy代理，并且将它返回。

```ts
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
}

// ...
const set =  createSetter()
const get =  createGetter()

// ...
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    let oldValue = (target as any)[key]
    if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
      return false
    }
    // 当不是 shallowReactive调用时，判断旧值是否是 Ref，如果是则直接更新旧值的 value
    if (!shallow) {
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue)
        value = toRaw(value)
      }
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
    } else {
        // 不做处理
    }

    // 判断 target 中是否存在 key
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    // 获取默认行为的返回值
    const result = Reflect.set(target, key, value, receiver)
    // target 需要和 receiver相等，不能是原型链上的属性
    if (target === toRaw(receiver)) {
      // 更新通知
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    return result
  }
}


function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    // ... 

    const res = Reflect.get(target, key, receiver)
    // 如果是js的内置方法，不做处理
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }
    // 收集依赖
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }
    // shallowReactive只代理一层
    if (shallow) {
      return res
    }
     // Ref类型数据已经被收集过依赖，直接返回其value值。
    if (isRef(res)) {
      return targetIsArray && isIntegerKey(key) ? res : res.value
    }
    // 嵌套对象，继续响应式的收集处理过程
    if (isObject(res)) {
      
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res
  }
}
```

上面我们主要分析对代理对象set、get拦截操作。可以发现下面几点：
* 对于`shallowReactive`和 `reactive`两者的依赖收集是不同的，前者只是浅层收集，后者则是深度收集。
* 其次对于`reactive`参数对象中包含的的ref对象，我们直接修改其value值，不做额外的收集。