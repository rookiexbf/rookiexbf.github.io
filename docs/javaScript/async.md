# Async
`Async/Await` 可以说是目前现阶段 JavaScript 解决异步的最终方案了。之前在 `Generator`结尾的时候我们有提到 `Async` 被当成是 `Generator` 和 `Promise` 的语法糖。怎么去理解呢？来看下 `Generator` 结合 `Promise` 如何处理异步问题：
``` ts
function promise1() {
  return new Promise((resolve) => {
      resolve('1');
  });
}

function promise2() {
  return new Promise((resolve) => {
      resolve('2');
  });
}

function* asyncAjax() {
  const params = yield promise1();
  const result = yield promise2(params);
  return result;
}

let gen = asyncAjax();
gen.next(); // { value: Promise {<fulfilled>: '1'}, done: false }
gen.next(); // { value: Promise {<fulfilled>: '2'}, done: true }
```
## co结合Generator
这里的感觉还是差点意思，我们试着改造一下asyncAjax的调用方式，尝试做到 `Async` 一样丝滑，这里借鉴 [ co ](https://link.zhihu.com/?target=https%3A//github.com/tj/co)。 库的实现方式，看看如何做到的：

``` ts
function co(fn) {
  return new Promise((resolve, reject) => {
    const gen = fn();
    function next(params) {
      const { done, value } = gen.next(params);
      if (!done) {
        // 未完成 继续递归
        Promise.resolve(value).then((res) => next(res));
      } else {
        // 完成直接重置 Promise 状态
        resolve(value);
      }
    }
    next();
  });
}
```
我们定义了一个 co 函数来包裹传入的 `Generator` 生成器函数，并且返回了一个 `Promise` 作为包裹函数的返回值。定义 next 方法，递归调用，看看效果如何吧：
``` ts
function promise1() {
  return new Promise((resolve) => {
      setTimeout(()=>{resolve('1')},1000) // [!code ++]
  });
}

function promise2() {
  return new Promise((resolve) => {
    setTimeout(()=>{resolve('2')},1000) // [!code ++]
  });
}

function* asyncAjax() {
  const params = yield promise1();
  const result = yield promise2(params);
  return result;
}
function co(fn) {
  return new Promise((resolve, reject) => {
    const gen = fn();
    function next(params) {
      const { done, value } = gen.next(params);
      if (!done) {
        // 未完成 继续递归
        Promise.resolve(value).then((res) => next(res));
      } else {
        // 完成直接重置 Promise 状态
        resolve(value);
      }
    }
    next();
  });
}
co(asyncAjax).then((res) => console.log(res));
```

ok，大功告成，来看看 `Async`的 `polyfill`实现。

## Async实现

``` ts
async function asyncAjax(){
   let a =  await new Promise.resolve(1)
}
```
``` ts
require("core-js/modules/es.object.to-string.js");

require("core-js/modules/es.promise.js");

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function asyncAjax() {
  return _asyncAjax.apply(this, arguments);
}

function _asyncAjax() {
  _asyncAjax = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var a;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return new Promise.resolve(1);

          case 2:
            a = _context.sent;

          case 3:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _asyncAjax.apply(this, arguments);
}
```
看到 `regeneratorRuntime.wrap(){ //...}` 这段代码，实在是太熟悉了，这不是就之前我们 `Generator` 的 `polyfill`吗？也就是说，`Async`是基于`_asyncToGenerator`包裹着的`Generator`实现的。接下来看看 `_asyncToGenerator` 做了什么，

```ts
function _asyncToGenerator(fn) {
    return function () {
        var self = this,
            args = arguments;
        return new Promise(function (resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'next', value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'throw', err);
            }
            _next(undefined);
        });
    };
}
```
可以看到`_asyncToGenerator`接受一个fn参数，它就是 `Generator` 函数，在调用 `asyncAjax` 的时候其实就是调用 `_asyncToGenerator`返回的函数，可以看到当返回的函数被调用时返回的是一个`Promise`，然后走到 `_next`->`asyncGeneratorStep`，`asyncGeneratorStep`：

```ts
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}
```
到这里一切就清楚了，这不就是我们之前`co`函数做的事情吗?一切都明朗了起来。`Async` 本质上还是利用 `Generator` 函数内部可以被暂停执行的特性结合 Promise.prototype.then 中进行递归调用从而实现的。
