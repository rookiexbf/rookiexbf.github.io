# Promise

Promise是什么？在javaScript中它是一个原生对象，是一种异步编程的解决方案。

* [ Promise ](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise)。

关于Promise的概念和使用，就不过多的赘述了 `MDN` 中已经给出了详细的说明和例子。

* [Promise A+ 规范](https://promisesaplus.com/)

不同浏览器/环境下对于 Promise 都有自己的实现，这里我们遵循`Promise/A+`规范去实现一个简版的`Promise`。

Promise/A+的规范比较长，我们做个小小的总结（这里可能会忽略部分细节的描述）：

1. `promise`有三种状态：`pending`、`fulfilled` 和 `rejected`，它必须处于三种状态之一。
    * 当`promise`状态为`pending`时，它的状态变更可以是`pending`=>`fulfilled` 或 `pending`=>`rejected`。
    * 当`promise`状态为`fulfilled`时，状态无法变更并且必须要有一个值`value`,`value`不能改变。
    * 当`promise`状态为`rejected`时，状态无法变更并且必须要有一个值`reason`,`reason`不能改变。
2. `promise`必须提供一个`then`方法，它接收两个参数 `promise.then(onFulfilled, onRejected)`。
    * `onFulfilled`都是`onRejected`可选参数，如果`onFulfilled`不是函数，则必须忽略它。`onRejected`同`onFulfilled`。
    * 如果`onFulfilled`是函数,它必须在`promise`的状态转变成为`fulfilled`之后调用，并且将`promise`的`value`值作为其第一个参数。
    * 如果`onRejected`是函数,它必须在`promise`的状态转变成为`rejected`之后调用，并且将`promise`的`reason`值作为其第一个参数。
    * `then`必须返回一个`promise`。
    * `then`可以在同一个`promise`上多次调用。




# 功能实现

## 1.实现Promise的状态管理
首先定义一个`Promise类`，它需要保存实例的状态和结果，并且提供改变状态的方法`reslove`和`reject`。

```ts
class Promise {
    constructor(callback) {
    this.status = 'pending';
    this.reason = undefined;
    this.value = undefined;
    
    const resolve = (value) => {
      if (this.status === 'pending') {
        this.status = 'fulfilled';
        this.value = value;
      }
    }

    const reject = (reason) => {
      if (this.status === 'pending') {
        this.status = 'rejected';
        this.reason = reason;
      }
    }
}
```

回想一下`Promsie`是如何使用的？
```ts
let myPromise = new Promise((res,rej)=>{
    // 函数体功能定义...
    // 在函数体中调用res或者rej方法，res和rej方法就是我们在上面定义的resolve和reject，我们把他传入进来。
    if(status=='200'){
        res()
    }else{
        rej()
    }
})
```

```ts
class Promise {
    constructor(callback) {
        this.status = 'pending';
        this.reason = undefined;
        this.value = undefined;
        
        const resolve = (value) => {
            if (this.status === 'pending') {
                this.status = 'fulfilled';
                this.value = value;
            }
        }

        const reject = (reason) => {
            if (this.status === 'pending') {
                this.status = 'rejected';
                this.reason = reason;
            }
        }

        // 这里使用tryCatch包裹，捕获代码异常并且抛出
        try {
            callback(resolve,reject);
        } catch (e) {
            reject(e);
        }
    }
}
```
现在我们已经完成了一个低配版的`Promise`了，它只包含了最基本的状态转变。

```ts

let a = new Promise((res,rej)=>{
        res(1);
        rej(2);
    })
let b = new Promise((res,rej)=>{
        rej(2);
        res(1);
    })

a   Promise {status: 'fulfilled', reason: undefined, value: 1} // [!code warning]
b   Promise {status: 'rejected', reason: 2, value: undefined}// [!code warning]

```

## 2.实现then方法

```ts
class Promise {
    constructor(callback) {
    this.status = 'pending';
    this.reason = undefined;
    this.value = undefined;
    
    const resolve = (value) => {
      if (this.status === 'pending') {
        this.status = 'fulfilled';
        this.value = value;
      }
    }

    const reject = (reason) => {
      if (this.status === 'pending') {
        this.status = 'rejected';
        this.reason = reason;
      }
    }

    // 这里使用tryCatch包裹，捕获代码异常并且抛出
    try {
      callback(resolve,reject);
    } catch (e) {
      reject(e);
    }
    
    then(onFulfilled, onRejected) {} // [!code ++]
}
```

首先我们来实现`then`的前三条:
* `onFulfilled`都是`onRejected`可选参数，如果`onFulfilled`不是函数，则必须忽略它。`onRejected`同`onFulfilled`。
* 如果`onFulfilled`是函数,它必须在`promise`的状态转变成为`fulfilled`之后调用，并且将`promise`的`value`值作为其第一个参数。
* 如果`onRejected`是函数,它必须在`promise`的状态转变成为`rejected`之后调用，并且将`promise`的`reason`值作为其第一个参数。

```ts
    then(onFulfilled, onRejected){
        onFulfilled =
            typeof onFulfilled === 'function' ? onFulfilled : (res) => res;
        onRejected =
            typeof onRejected === 'function' ? onRejected : (error) => { throw error; }
        if (this.status === 'fulfilled') {
            onFulfilled(this.value);
        }
        if (this.status === 'rejected') {
            onRejected(this.reason);
        }
    }
```

看看效果
``` ts
let resolve = new Promise((res,rej)=>{
        res('res');
    }).then((value)=>{
        console.log('value：'+value)
        value：res // [!code warning]
    },(reason)=>{
        console.log('reason：'+reason)
    })
let reject = new Promise((res,rej)=>{
        rej('rej');
    }).then((value)=>{
        console.log('value：'+value)
    },(reason)=>{
        console.log('reason：'+reason)
        reason：rej // [!code warning]
    })
```

Ok，现在看看后面两条
* `then`必须返回一个`promise`。
* `then`可以在同一个`promise`上多次调用。


``` ts
then(onFulfilled, onRejected){
    // ...
    let newPromise = new Promise((resolve, reject) => {
        // 需要根据promise不同的状态做处理，先处理简单的fulfilled和rejected状态吧。
        if (this.status === 'fulfilled') {
            try {
                // 这里我们需要拿到onFulfilled函数的返回值并且判断返回值是否是Promise，如果是那么等待x状态改变的时候去改变当前newPromise的状态，否则直接将newPromise置为fulfilled状态。
                let x = onFulfilled(this.value);
                x instanceof Promise ? x.then(resolve, reject) : resolve(x)
            } catch (e) {
                reject(e);
            }
        }
        // 同上处理
        if (this.status === 'rejected') {
            try {
                let x = onRejected(this.reason);
                x instanceof Promise ? x.then(resolve, reject) : reject(x);
            } catch (e) {
                reject(e);
            }
        }
        // 如果then方法调用时promise还是pending状态则需要将操作包在箭头函数体内推入fulfillCallbacks保存
        if (this.status === 'pending') {
            // 等待promise的resolve方法调用时清空fulfillCallbacks
            this.fulfillCallbacks.push(() => {
                try {
                    let x = onFulfilled(this.value);
                    x instanceof Promise ? x.then(resolve, reject) : resolve(x);
                } catch (e) {
                    reject(e);
                }
            });
            this.rejectedCallbacks.push(() => {
                try {
                    let x = onRejected(this.reason);
                    x instanceof Promise ? x.then(resolve, reject) : reject(x);
                } catch (e) {
                    reject(e);
                }
            });

        }

    })
    // 返回一个promise对象
    return newPromise;
}
```

所以当promise为pending的时候我们的`Promise`也需要做一点修改

``` ts
class Promise {
    constructor(callback) {
        this.status = 'pending';
        this.reason = undefined;
        this.value = undefined;
        this.fulfillCallbacks = []; // [!code ++]
        this.rejectedCallbacks = []; // [!code ++]
        
        const resolve = (value) => {
            if (this.status === 'pending') {
                this.status = 'fulfilled';
                this.value = value;
                this.fulfillCallbacks.forEach((cb) => { // [!code ++]
                    cb(); // [!code ++]
                }); // [!code ++]
            }
        }

        const reject = (reason) => {
            if (this.status === 'pending') {
                this.status = 'rejected';
                this.reason = reason;
                this.rejectedCallbacks.forEach((cb) => { // [!code ++]
                    cb(); // [!code ++]
                }); // [!code ++]
            }
        }
    }
}
```

好像看起来没啥问题了，我们先来测试一下吧。

``` ts
console.log(1);
let promise1 = new Promise((resolve, reject) => {
    console.log(2);
    resolve('这次一定');
})
promise1.then(
    result => {
        console.log('fulfilled:', result);
    },
    reason => {
        console.log('rejected:', reason)
    }
)
console.log(3);

1 // [!code error]
2 // [!code error]
fulfilled: 这次一定 // [!code error]
3 // [!code error]

```

有点不对经，输出顺序不应该是 `1 2 3 fulfilled: 这次一定` 吗？因为`promise.then`的回调是异步执行的，因为我们在实现Promise，所以就利用setTimeout来模拟异步吧。

``` ts
class Promise {
    constructor(callback) {
        this.status = 'pending';
        this.reason = undefined;
        this.value = undefined;
        this.fulfillCallbacks = []; 
        this.rejectedCallbacks = []; 
        
        const resolve = (value) => {
            if (this.status === 'pending') {
                setTimeout(() => { // [!code ++]
                    this.status = 'fulfilled';
                    this.value = value;
                    this.fulfillCallbacks.forEach((cb) => { 
                        cb(); 
                    }); 
                }) // [!code ++]
            }
        }

        const reject = (reason) => {
            if (this.status === 'pending') {
                setTimeout(() => { // [!code ++]
                    this.status = 'rejected';
                    this.reason = reason;
                    this.rejectedCallbacks.forEach((cb) => { 
                        cb(); 
                    }); 
                }) // [!code ++]
            }
        }
    }

    then(onFulfilled, onRejected){
        // ...
        let newPromise = new Promise((resolve, reject) => {
            // 需要根据promise不同的状态做处理，先处理简单的fulfilled和rejected状态吧。
            if (this.status === 'fulfilled') {
                setTimeout(() => {  // [!code ++]
                    try {
                        // 这里我们需要拿到onFulfilled函数的返回值并且判断返回值是否是Promise，如果是那么等待x状态改变的时候去改变当前newPromise的状态，否则直接将newPromise置为fulfilled状态。
                        let x = onFulfilled(this.value);
                        x instanceof Promise ? x.then(resolve, reject) : resolve(x)
                    } catch (e) {
                        reject(e);
                    }
                });  // [!code ++]
            }
            // 同上处理
            if (this.status === 'rejected') {
                setTimeout(() => {  // [!code ++]
                    try {
                        let x = onRejected(this.reason);
                        x instanceof Promise ? x.then(resolve, reject) : reject(x);
                    } catch (e) {
                        reject(e);
                    }
                }); // [!code ++]
            }
            // ...
        })
        // 返回一个promise对象
        return newPromise;
    }
}
```
OK，大功告成，`Promise`的主要功能基本实现了，其他的就比较简单，再接再厉把剩下的其他方法一起实现了吧。

## 3.其他的api

## Promise.prototype.catch

``` ts
// 就是执行then的第二个callback
catch(errorCallback) {
    return this.then(null, errorCallback);
}
```

## Promise.prototype.finally

``` ts
finally(callback) {
    return this.then(
        value => Promise.resolve(callback()).then(() => value),             
        reason => Promise.resolve(callback()).then(() => { throw reason })  
    )
}
```

## Promise.all
```ts
static all(promises) {
    return new myPromise((resolve, reject) => {
        // 参数校验
        if (Array.isArray(promises)) {
            let result = []; // 存储结果
            let count = 0; // 计数器
            if (promises.length === 0) {
                return resolve(promises);
            }
            promises.forEach((promise, index) => {
                Promise.resolve(promise).then(
                    (value) => {
                        count++;
                        // 每个promise执行的结果存储在result中
                        result[index] = value;
                        // Promise.all 等待所有都完成（或第一个失败）
                        count === promises.length && resolve(result);
                    },
                    (reason) => {
                        reject(reason);
                    }
                );
            });
        } else {
            return reject(new TypeError('TypeError'));
        }
    });
}
```

## Promise.allSettled
``` ts
static allSettled(promises) {
    return new Promise((resolve, reject) => {
        // 参数校验
        if (Array.isArray(promises)) {
            let result = []; // 存储结果
            let count = 0; // 计数器
            if (promises.length === 0) {
                return resolve(promises);
            }
            promises.forEach((promise, index) => {
                Promise.resolve(promise).then(
                (value) => {
                    count++;
                    // 对于每个结果对象，都有一个 status 字符串。如果它的值为 fulfilled，则结果对象上存在一个 value 。
                    result[index] = {
                        status: 'fulfilled',
                        value
                    };
                    // 所有给定的promise都已经fulfilled或rejected后,返回这个promise
                    count === promises.length && resolve(result);
                },
                (reason) => {
                    count++;
                    result[index] = {
                        status: 'rejected',
                        reason
                    };
                    count === promises.length && resolve(result);
                }
                );
            });
        } else {
            return reject(new TypeError('TypeError'));
        }
    });
}
```

## Promise.any
```ts
static any(promises) {
    return new Promise((resolve, reject) => {
        // 参数校验
        if (Array.isArray(promises)) {
            let errors = []; //
            let count = 0; // 计数器
            promises.forEach((promise) => {
                Promise.resolve(promise).then(
                (value) => {
                    // 只要其中的一个 promise 成功，就返回那个已经成功的 promise
                    resolve(value);
                },
                (reason) => {
                    count++;
                    errors.push(reason);
                    // 如果所有 promise 都失败则reject
                    count === promises.length && reject(errors);
                }
                );
            });
        } else {
            return reject(new TypeError('TypeError'));
        }
    });
}
```

## Promise.race

```ts
static race(promises) {
    return new Promise((resolve, reject) => {
        // 参数校验
        if (Array.isArray(promises)) {
            // 如果传入的迭代promises是空的，则返回的 promise 将永远等待。
            if (promises.length > 0) {
                promises.forEach((item) => {
                    // 返回迭代中找到的第一个值。
                    Promise.resolve(item).then(resolve, reject);
                });
            }
        } else {
            return reject(new TypeError('TypeError'));
        }
    });
}
```

## Promise.resolve

``` ts
static resolve(value) {
    if (value instanceof Promise) {
        return value  
    } else {
        return new Promise((resolve, reject) => {
            resolve(value)
        })
    }
}
```
## Promise.reject

``` ts
static reject(reason) {
    return new Promise((resolve, reject) => {
        reject(reason);
    });
}
```


很好，大功告成，下一篇我们来看看Generator吧:tada::tada::tada:！