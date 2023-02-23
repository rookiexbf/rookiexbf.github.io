``` ts
class MyPromise {
    constructor(callback) {
        this.status = 'pending';
        this.reason = undefined;
        this.value = undefined;
        this.fulfillCallbacks = []; // [!code ++]
        this.rejectedCallbacks = []; // [!code ++]

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
        // 这里使用tryCatch包裹，捕获代码异常并且抛出
        try {
            callback(resolve,reject);
        } catch (e) {
            reject(e);
        }
    }

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
}
```