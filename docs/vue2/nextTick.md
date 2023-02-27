# nextTick 原理分析

::: tip nextTick是什么
在分析之前,我们首先需要知道```nextTick```这个api为什么会存在,它的作用是什么？
:::

## 由来

首先我们知道在Vue的响应式系统中更改一个响应式数据的状态的时候，Vue并不是去同步的去更新DOM的状态,而是开启了一个调度任务scheduler，它将我们本次"tick"中修改响应式状态的操作都推进一个queue（队列）中，放到下个"tick"中一起执行，这可以保证Vue开发者在同步修改组件当前状态的时候保证组件只会更新一次，也就是Vue中提到的异步更新操作。

`nextTick()`可以在响应式数据状态改变后立即使用，以获取最新的 DOM 状态。

::: tip 我们可以把"tick"理解为浏览器事件循环中的一次循环体。
:::


## 代码分析

```ts
// 是否支持微任务队列
export let isUsingMicroTask = false

// callbacks保存状态修改操作的队列
const callbacks: Array<Function> = []
// pending用于判断当前是否在清空队列操作
let pending = false
// 批量操作处理
function flushCallbacks() {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}
// 这里是对nextTick方法做兼容处理，从Promise=>MutationObserver=>setImmediate=>setTimeout降级处理。
let timerFunc
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (
  !isIE &&
  typeof MutationObserver !== 'undefined' &&
  (isNative(MutationObserver) ||
    MutationObserver.toString() === '[object MutationObserverConstructor]')
) {
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

// 这里是nextTick方法重载和实现的地方
export function nextTick(): Promise<void>
export function nextTick<T>(this: T, cb: (this: T, ...args: any[]) => any): void
export function nextTick<T>(cb: (this: T, ...args: any[]) => any, ctx: T): void
/**
 * @internal
 */
export function nextTick(cb?: (...args: any[]) => any, ctx?: object) {
  let _resolve
// 这里将我们本次操作推进callbacks队列中
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e: any) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
// 首次执行pending为false,执行timerFunc方法，调用flushCallbacks去执行清空callbacks队列,pending=true。
  if (!pending) {
    pending = true
    timerFunc()
  }
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
```

在上述代码块中我们解读了主要流程，现在我们来重新串连一下吧。

1、首先我们进到nextTick文件模块，判断当前环境是否支持微任务队列，并且创建一个callbacks用于数组保存我们`nextTick`接受的第一个传参，并且标识当前的是否处于清空任务队列的状态（pending）。

```ts
// 是否支持微任务队列
export let isUsingMicroTask = false
// callbacks保存状态修改操作的队列
const callbacks: Array<Function> = []
// pending用于判断当前是否在清空队列操作
let pending = false
```

2、这里timerFunc相关的代码我们摘取一段作为讲解，后续的代码也就是对宿主环境做相关兼容处理。首先判断当前环境是否支持Promise，走到下一步，并且定义timerFunc函数中执行Promise.resolve的回调。（等到nextTick执行的时候回来看 :grin:）

```ts
// 这里是对nextTick方法做兼容处理，从Promise=>MutationObserver=>setImmediate=>setTimeout降级处理。
let timerFunc
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
}
```

3、最后就到了我们这次讲解的主角`nextTick`的主体了,当我们执行this.$nextTick(callback)的时候，将callback保存在一个匿名函数中推入callbacks数组。

```ts
// 这里将我们本次操作推进callbacks队列中
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e: any) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
```

接着我们来到下一步，执行timerFunc方法，并且pending = true表示当前循环已经在批量执行操作了，这里timerFunc执行的含义就是在浏览器的事件循环中，在本次循环体中执行一次flushCallbacks函数（这里用的通过Promise实现）。

```ts
// 首次执行pending为false,执行timerFunc方法，调用flushCallbacks去执行清空callbacks队列,pending=true。
  if (!pending) {
    pending = true
    timerFunc()
  }

// 回顾一下之前timerFunc的定义
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    if (isIOS) setTimeout(noop)
  }
```

所以最后当我们开始执行this.$nextTick(callback)的时候，延迟执行了callback中的代码，就能获取到最新的DOM了:kissing_smiling_eyes:。

```ts
    <template>
        <p>{{a}}</p>
    </template>

    <script>
        this.a = 1;
        this.$nextTick(callback)
    </script>
```

```ts
// 批量操作处理
function flushCallbacks() {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}
```