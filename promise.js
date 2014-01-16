'use strict';
(function(root) {
    /****************************
     Public Constructor
     ****************************/

    function Promise(resolver) {
        var promise = new PendingPromise();
        var self = this;

        this.then = function then(onFulfilled, onRejected) {
            var deferred = createDeferred(self.constructor);
            return promise.resolve(deferred, onFulfilled, onRejected) || self;
        };

        var _reject = function reject(reason) {
            _resolve = _reject = noop;
            var p = new RejectedPromise(reason);
            promise.resolveQueued(p);
            promise = p;
        };
        var _resolve = function resolve(value) {
            var deferred = {
                promise: self,
                reject: _reject,
                resolve: function(value) {
                    var p = new FulfilledPromise(value);
                    promise.resolveQueued(p);
                    promise = p;
                }
            };
            _resolve = _reject = noop;
            doResolve(deferred, function() { return value; });
        };

        resolver(function(value) {
            _resolve(value);
        }, function(reason) {
            _reject(reason);
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

    Promise.resolve = function resolve(value) {
        return new this(function(resolve) {
            resolve(value);
        });
    };

    Promise.reject = function reject(reason) {
        return new this(function(_, reject) {
            reject(reason);
        });
    };

    Promise.deferred = function deferred() {
        return createDeferred(this);
    };

    Promise.cast = function cast(obj) {
        if (isObject(obj) && obj.constructor === this) {
            return obj;
        }

        return new this(function(resolve) {
            resolve(obj);
        });
    };

    Promise.all = function all(promises) {
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

    Promise.race = function race(promises) {
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
    FulfilledPromise.prototype.resolve = function(deferred, onFulfilled) {
        if (!isFunction(onFulfilled)) { return; }
        var value = this.value;

        defer(function() { doResolve(deferred, function() { return onFulfilled(value); }); });
        return deferred.promise;
    };

    function RejectedPromise(reason) {
        this.reason = reason;
    }
    RejectedPromise.prototype.resolve = function(deferred, _, onRejected) {
        if (!isFunction(onRejected)) { return; }
        var reason = this.reason;

        defer(function() { doResolve(deferred, function() { return onRejected(reason); }); });
        return deferred.promise;
    };

    function PendingPromise() {
        this.queue = [];
    }
    PendingPromise.prototype.resolve = function(deferred, onFulfilled, onRejected) {
        this.queue.push([
            deferred,
            isFunction(onFulfilled) ? onFulfilled : identity,
            isFunction(onRejected) ? onRejected : rejectIdentity
        ]);
        return deferred.promise;
    };
    PendingPromise.prototype.resolveQueued = function(promise) {
        var queue = this.queue, tuple;
        for (var i = 0, l = queue.length; i < l; i++) {
            tuple = queue[i];
            promise.resolve(tuple[0], tuple[1], tuple[2]);
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
        var deferred = {
            promise: void 0,
            resolve: void 0,
            reject: void 0
        };
        deferred.promise = new Promise(function(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    }

    var nextTick = typeof process !== 'undefined' && isFunction(process.nextTick) ? process.nextTick
        : typeof setImmediate !== 'undefined' ? setImmediate
        : function(fn) { setTimeout(fn, 1); };
    var defer = (function() {
        var queue = [];
        function flush() {
            // Do **NOT** cache queue.length.
            // Any callback in the queue can append to the queue,
            // and we want to handle them too.
            for (var i = 0; i < queue.length; i++) {
                queue[i]();
            }
            queue = [];
        }
        return function defer(fn) {
            if (queue.push(fn) === 1) {
                nextTick(flush);
            }
        };
    })();

    function doResolve(deferred, xFn) {
        var _reject = deferred.reject;
        var _resolve;
        var then;
        var x;
        try {
            x = xFn();
            if (x === deferred.promise) {
                throw new TypeError('A promise cannot be fulfilled with itself.');
            }
            if (isObject(x) && (then = x.then) && isFunction(then)) {
                _resolve = function resolvePromise(y) {
                    _resolve = _reject = noop;
                    doResolve(deferred, function() { return y; });
                };
                _reject = function rejectPromise(reason) {
                    _resolve = _reject = noop;
                    deferred.reject(reason);
                };
                then.call(
                    x,
                    function(y) { _resolve(y); },
                    function(r) { _reject(r); }
                );
            } else {
                deferred.resolve(x);
            }
        } catch (e) {
            _reject(e);
        }
    }

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Promise;
        }
        exports.Promise = Promise;
    } else {
        root.Promise = Promise;
    }
})(this);
