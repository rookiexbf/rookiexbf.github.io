# Generator函数

::: tip `Generator` 函数也是 ES6 提供的一种异步编程解决方案。它与普通函数不同，可以帮助我们创建有状态的迭代器对象(iterate)。
:::

`Generator` 在日常开发中可能不如 `Promise` 和 `Async` 函数那么常见。所以我们会讲解一些基础用法和概念，本篇的目的主要是为了让大家能够平滑的过渡到 `Async`。

## 什么是Generator函数？

在JavaScript中的Generator函数是一种新的语法规则，它使函数可暂停和恢复，允许你用类似控制流程的方式来写代码。它是一个标准的异步处理机制，可以让你用一种同步的方式来写异步代码而不像 `Promise` 那样使用回调函数进行异步操作。

我们来看一个简单的例子体会一下：

``` ts
function* generator() {
    yield 'hello';
    yield 'world';
}

const myGen = generator();
console.log(myGen.next()); // { value: 'hello', done: false }
console.log(myGen.next()); // { value: 'world', done: false }
console.log(myGen.next()); // {value: undefined, done: true}
```

函数声明后添加一个 `*` 修饰符,表示这个函数是一个`Generator`函数，调用生成器函数会返回一个`Generator`实例对象，这个对象包含一个`next`方法：
``` ts
{
    next () {
        return {
            done:Boolean, // done表示生成器函数是否执行完毕 它是一个布尔值
            value: VALUE, // value表示生成器函数本次调用返回的值
        }
    }
}
```
现在我们通过拆解上面的执行过程来感受一下：
* 首先调用 generator() 生成器函数返回 myGen 实例对象。
* 然后我们调用 myGen.next() 方法时，函数开始执行，直到函数碰到 `yield` 关键字。
* `yield` 关键字会停止函数执行并将 yield 后的值返回作为本次调用 next 函数的 value 进行返回。
* 如果当前调用 myGen.next() 导致生成器函数执行完毕，那么此时 done 会变成 true 表示该函数执行完毕，否则为 false 。

现在思考一下，我们编写异步代码，是不是通常需要获取异步调用的返回的状态来进行下一步的操作，那么如何传入参数呢？我们来看这样一段代码：
``` ts
function* generator() {
    const a = yield 1;
    console.log(a,'a')
    const b = yield 2;
    console.log(b,'b')
    const c = yield 3;
    console.log(c,'c')
}

const myGen = generator();

myGen.next(); // { value: 1, done: false }
myGen.next('a'); // { value: 2, done: false }
myGen.next('b'); // { value: 3, done: false }
myGen.next('c'); // { value: undefined, done: true }

// 控制台输出
// a 'a'
// b 'b'
// c 'c'
```

所以当我们为 `next` 传递值进行调用时，传入的值会被当作上一次生成器函数暂停时 yield 关键字的返回值处理。

## Generator 原理实现

我们先来看看 `Generator` 的 `polyfill`是如何实现的吧。

``` ts
function* generator() {
    const a = yield 1;
    console.log(a,'a')
    const b = yield 2;
    console.log(b,'b')
    const c = yield 3;
    console.log(c,'c')
}

const myGen = generator();

myGen.next(); 
myGen.next('a'); 
myGen.next('b'); 
myGen.next('c'); 

```

``` ts
require("regenerator-runtime/runtime.js");

var _marked = /*#__PURE__*/regeneratorRuntime.mark(generator);

function generator() {
    var a, b, c;
    return regeneratorRuntime.wrap(function generator$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
            case 0:
                _context.next = 2;
                return 1;

            case 2:
                a = _context.sent;
                console.log(a, 'a');
                _context.next = 6;
                return 2;

            case 6:
                b = _context.sent;
                console.log(b, 'b');
                _context.next = 10;
                return 3;

            case 10:
                c = _context.sent;
                console.log(c, 'c');

            case 12:
            case "end":
                return _context.stop();
            }
        }
    }, _marked);
}

var myGen = generator();
myGen.next();
myGen.next('a');
myGen.next('b');
myGen.next('c');
```

`require("regenerator-runtime/runtime.js")`可以看做给我们提供了一个`Generator`函数的运行时，我们可以简单理解为它给我们提供了这样一个对象结构：
``` ts
const regeneratorRuntime = {
    mark(fn) {
        return fn
    },
    wrap(fn,fn) {
        return {
            next() {
                done: //
                value: //
            }
        }
    }
}
```

可以看出我们的状态流转需要一个上下文对象来保存`_context`

``` ts
const regeneratorRuntime = {
    mark(fn) {
        return fn
    },
    wrap(fn,fn) {
        const _context = {  // [!code ++]
            prev: undefined // 本次生成器函数执行时的d索引  // [!code ++]
            next: 0, // 下一次执行生成器函数状态机的索引  // [!code ++]
            sent: '', // next调用时候传入的值 作为上一次yield返回值  // [!code ++]
            done: false, // 是否完成  // [!code ++]
            stop(){  // [!code ++]
                this.done = true;  // [!code ++]
            }  // [!code ++]
        };  // [!code ++]
        return {
            next(params) {
                // 1. 修改上一次yield返回值为context.sent  // [!code ++]
                _context.sent = param;  // [!code ++]
                // 2.执行函数 获得本次返回值  // [!code ++]
                const value = fn(_context);  // [!code ++]
                // 3. 返回
                return {
                    done: _context.done,
                    value,
                };
            }
        }
    }
}
```

好了现在我们来试试看吧
``` ts
const regeneratorRuntime = {
    mark(fn) {
        return fn
    },
    wrap(fn,markFn) {
        const _context = {
            prev: undefined, // 本次生成器函数执行时的d索引
            next: 0, // 下一次执行生成器函数状态机的索引
            sent: '', // next调用时候传入的值 作为上一次yield返回值
            done: false, // 是否完成
            stop(){
                this.done = true;
            }
        };
        return {
            next(params) {
                // 1. 修改上一次yield返回值为context.sent
                _context.sent = params;
                // 2.执行函数 获得本次返回值
                const value = fn(_context);
                // 3. 返回
                return {
                    done: _context.done,
                    value,
                };
            }
        }
    }
}

var _marked = /*#__PURE__*/regeneratorRuntime.mark(generator);

function generator() {
    var a, b, c;
    return regeneratorRuntime.wrap(function generator$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
            case 0:
                _context.next = 2;
                return 1;

            case 2:
                a = _context.sent;
                console.log(a, 'a');
                _context.next = 6;
                return 2;

            case 6:
                b = _context.sent;
                console.log(b, 'b');
                _context.next = 10;
                return 3;

            case 10:
                c = _context.sent;
                console.log(c, 'c');

            case 12:
            case "end":
                return _context.stop();
            }
        }
    }, _marked);
}

var myGen = generator();
myGen.next(); // { value: 1, done: false }
myGen.next('a'); // { value: 2, done: false }
myGen.next('b'); // { value: 3, done: false }
myGen.next('c'); // { value: undefined, done: true }
```

所以 `Generator`函数 它本质上就是通过包裹了一个状态机函数并且维护一个`_context`对象，从而实现了状态的流转。
不过前面也有提到 `Generator`比较少见，它只是一个异步编程的过渡方案，但是我们下面要提到的 `Async`确是基于  `Generator` 和 `Promise` 的语法糖，所以理解了 `Generator` 也就理解了 `Async`。
