'use strict';
(function(root) {
    /****************************
     Public Constructor
     ****************************/

    function Promise(resolver) {
        var promise = new PendingPromise();
        var self = this;

        this.then = function(onFulfilled, onRejected) {
            var deferred = createDeferred(this.constructor);
            return promise.then(self, deferred, onFulfilled, onRejected);
        };

        var reject = function(reason) {
            resolve = reject = noop;
            var p = new RejectedPromise(reason);
            promise.resolve(p);
            promise = p;
        };
        var resolve = function(value) {
            var deferred = {
                promise: self,
                reject: reject,
                resolve: function(value) {
                    var p = new FulfilledPromise(value);
                    promise.resolve(p);
                    promise = p;
                }
            };
            resolve = reject = noop;
            doResolve(deferred, constant(value));
        };

        resolver(function(value) {
            resolve(value);
        }, function(reason) {
            reject(reason);
        });
    }

    /****************************
     Public Instance Methods
     ****************************/

    Promise.prototype.catch = function(onRejected) {
        return this.then(void 0, onRejected);
    };

    Promise.prototype.throw = function() {
        return this.catch(function(error) {
            // Defer it, so our promise doesn't catch
            // it and turn it into a rejected promise.
            defer(function() {
                throw error;
            });

            throw error;
        });
    };

    /****************************
     Public Static Methods
     ****************************/

    Promise.resolve = function(value) {
        return new this(function(resolve) {
            resolve(value);
        });
    };

    Promise.reject = function(reason) {
        return new this(function(_, reject) {
            reject(reason);
        });
    };

    Promise.deferred = function() {
        return createDeferred(this);
    };

    Promise.cast = function(obj) {
        if (isObject(obj) && obj.constructor === this) {
            return obj;
        }

        return new this(function(resolve) {
            resolve(obj);
        });
    };

    Promise.all = function(promises) {
        var Constructor = this;
        return new Constructor(function(resolve, reject) {
            var l = promises.length;
            var values = Array(l);
            var resolveAfter = after(l + 1, function() {
                resolve(values);
            });
            resolveAfter();

            var promise;
            for (var i = 0; i < l; i++) {
                promise = promises[i];
                Constructor.cast(promise).then(fillSlot(values, i, resolveAfter), reject);
            }
        });
    };

    Promise.race = function(promises) {
        var Constructor = this;
        return new Constructor(function(resolve, reject) {
            var promise;
            for (var i = 0, l = promises.length; i < l; i++) {
                promise = promises[i];
                Constructor.cast(promise).then(resolve, reject);
            }
        });
    };

    /****************************
      Private functions
     ****************************/

    function FulfilledPromise(value) {
        this.value = value;
    }
    FulfilledPromise.prototype.then = function(promise, deferred, onFulfilled) {
        if (!isFunction(onFulfilled)) { return promise; }
        onFulfilled = partial(onFulfilled, this.value);
        defer(function() {
            doResolve(deferred, onFulfilled);
        });
        return deferred.promise;
        // return new promise.constructor(function(resolve) {
            // // defer(function() {
            // resolve(onFulfilled());
            // // });
        // });
    };

    function RejectedPromise(reason) {
        this.reason = reason;
    }
    RejectedPromise.prototype.then = function(promise, deferred, _, onRejected) {
        if (!isFunction(onRejected)) { return promise; }
        onRejected = partial(onRejected, this.reason);
        defer(function() {
            doResolve(deferred, onRejected);
        });
        // defer(partial(onRejected, this.reason));
        return deferred.promise;
        // return new promise.constructor(function(resolve) {
            // resolve(onRejected());
        // });
    };

    function PendingPromise() {
        this.queue = [];
    }
    PendingPromise.prototype.then = function(promise, deferred, onFulfilled, onRejected) {
        this.queue.push([
            deferred,
            assumeFunction(onFulfilled, identity),
            assumeFunction(onRejected, rejectIdentity)
        ]);
        return deferred.promise;
    };
    PendingPromise.prototype.resolve = function(promise) {
        var queue = this.queue, tuple;
        for (var i = 0, l = queue.length; i < l; i++) {
            tuple = queue[i];
            promise.then(void 0, tuple[0], tuple[1], tuple[2]);
        }
    };


    function noop() {}
    function identity(x) { return x; }
    function rejectIdentity(x) { throw x; }
    function isFunction(fn) {
        return typeof fn === 'function';
    }
    function isObject(obj) {
        return obj && (typeof obj === 'object' || typeof obj === 'function');
    }
    function assumeFunction(fn, backup) {
        return (isFunction(fn)) ? fn : backup;
    }
    function partial(fn, arg1) {
        return function(arg2) {
            return fn.call(this, arg1, arg2);
        };
    }
    function constant(x) {
        return function() {
            return x;
        };
    }
    function after(times, fn) {
        return function() {
            if (--times < 1) { fn(); }
        };
    }
    function fillSlot(array, index, fn) {
        return function(value) {
            array[index] = value;
            fn();
        };
    }
    function createDeferred(Promise) {
        var deferred = {};
        deferred.promise = new Promise(function(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    }

    var defer = (function(queue) {
        function flush() {
            // Do **NOT** cache queue.length.
            // Any callback in the queue can append to the queue,
            // and we want to handle them too.
            for (var i = 0; i < queue.length; i++) {
                queue[i]();
            }
            queue = [];
        }
        return function(fn) {
            if (queue.push(fn) === 1) {
                nextTick(flush);
            }
        };
    })([]);
    var nextTick = typeof process !== 'undefined' && isFunction(process.nextTick) ? process.nextTick
        : typeof setImmediate !== 'undefined' ? setImmediate
        : function(fn) { setTimeout(fn, 1); };

    /*
    function doResolve(self, xFn) {
        var then;
        try {
            var x = xFn();
            if (x === self) {
                throw new TypeError('A promise cannot be fulfilled with itself.');
            }
            if (isObject(x) && (then = x.then) && isFunction(then)) {
                if (x.constructor === self.constructor) {
                    return x;
                }
                return new self.constructor(function(resolve, reject) {
                    then.call(x, resolve, reject);
                });
            } else {
                return new FulfilledPromise(x);
            }
        } catch (e) {
            return new RejectedPromise(e);
        }
    }
    /*/
    function doResolve(deferred, xFn) {
        var then;
        var resolvePromise = function(y) {
            resolvePromise = rejectPromise = noop;
            doResolve(deferred, constant(y));
        };
        var rejectPromise = function(reason) {
            resolvePromise = rejectPromise = noop;
            deferred.reject(reason);
        };
        try {
            var x = xFn();
            if (x === deferred.promise) {
                return rejectPromise(new TypeError('A promise cannot be fulfilled with itself.'));
            }
            if (isObject(x) && (then = x.then) && isFunction(then)) {
                then.call(
                    x,
                    function(y) { resolvePromise(y); },
                    function(r) { rejectPromise(r); }
                );
            } else {
                deferred.resolve(x);
            }
        } catch (e) {
            rejectPromise(e);
        }
    }
    //*/

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Promise;
        }
        exports.Promise = Promise;
    } else {
        root.Promise = Promise;
    }
})(this);
