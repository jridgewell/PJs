'use strict';
(function(root) {
    /****************************
     Public Constructor
     ****************************/

    function Promise(resolver) {
        if (!this instanceof Promise) {
            throw new TypeError("Constructor Promise requires 'new'");
        }

        var self = this;
        var promise;

        this.then = function(onFulfilled, onRejected) {
            if (!onFulfilled && !onRejected) { return this; }
            if (!promise) { promise = new PendingPromise(); }
            var deferred = new Deferred(this.constructor);
            return promise.resolve(
                deferred,
                isFunction(onFulfilled) ? onFulfilled : deferred.resolve,
                isFunction(onRejected) ? onRejected : deferred.reject,
                this
            );
        };

        var _reject = function() {
            _resolve = _reject = noop;
            var reasons = toArray.apply(void 0, arguments);
            var p = new RejectedPromise(reasons);
            if (promise) { promise.resolveQueued(p); }
            promise = p;
        };
        var _resolve = function() {
            var deferred = {
                promise: self,
                reject: _reject,
                resolve: function resolve() {
                    var values = toArray.apply(void 0, arguments);
                    var p = new FulfilledPromise(values);
                    if (promise) { promise.resolveQueued(p); }
                    promise = p;
                }
            };
            _resolve = _reject = noop;
            doResolve.apply(deferred, arguments);
        };

        tryCatchResolver(resolver, function resolve() {
            apply(_resolve, arguments);
        }, function reject() {
            apply(_reject, arguments);
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

    Promise.resolve = function(obj) {
        if (isObject(obj) && obj.constructor === this) {
            return obj;
        }

        var values = toArray.apply(void 0, arguments);
        return new this(function(resolve) {
            apply(resolve, values);
        });
    };

    Promise.reject = function() {
        var reasons = toArray.apply(void 0, arguments);
        return new this(function(_, reject) {
            apply(reject, reasons);
        });
    };

    Promise.deferred = function() {
        return new Deferred(this);
    };

    Promise.all = function(promises) {
        var Constructor = this;
        return new Constructor(function(resolve, reject) {
            var l = promises.length;
            var values = new Array(l);
            var times = l;

            if (times === 0) {
                return resolve(values);
            }
            var resolveAfter = function() {
                if (--times === 0) { resolve(values); }
            };

            for (var i = 0; i < l; i++) {
                Constructor.resolve(promises[i]).then(fillSlot(values, i, resolveAfter), reject);
            }
        });
    };

    Promise.race = function(promises) {
        var Constructor = this;
        return new Constructor(function(resolve, reject) {
            for (var i = 0, l = promises.length; i < l; i++) {
                Constructor.resolve(promises[i]).then(resolve, reject);
            }
        });
    };

    /****************************
      Private functions
     ****************************/

    function Deferred(Promise) {
        var deferred = this;
        this.promise = new Promise(function(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
    }

    function FulfilledPromise(values) {
        this.values = values;
    }
    FulfilledPromise.prototype.resolve = function(deferred, onFulfilled, _, previous) {
        if (!onFulfilled) { return previous; }
        defer(tryCatchDeferred(deferred, onFulfilled, this.values));
        return deferred.promise;
    };

    function RejectedPromise(reasons) {
        this.reasons = reasons;
    }
    RejectedPromise.prototype.resolve = function(deferred, _, onRejected, previous) {
        if (!onRejected) { return previous; }
        defer(tryCatchDeferred(deferred, onRejected, this.reasons));
        return deferred.promise;
    };

    function PendingPromise() {
        this.queue = [];
    }
    PendingPromise.prototype.resolve = function(deferred, onFulfilled, onRejected) {
        this.queue.push({
            deferred: deferred,
            onFulfilled: onFulfilled,
            onRejected: onRejected
        });
        return deferred.promise;
    };
    PendingPromise.prototype.resolveQueued = function(promise) {
        var queue = this.queue;
        for (var i = 0, l = queue.length; i < l; i++) {
            var next = queue[i];
            promise.resolve(next.deferred, next.onFulfilled, next.onRejected);
        }
    };

    function noop() {}
    function isFunction(fn) {
        return typeof fn === 'function';
    }
    function isObject(obj) {
        return obj && (typeof obj === 'object' || typeof obj === 'function');
    }
    function apply(fn, args) {
        return (args.length > 1) ? fn.apply(void 0, args) : fn(args[0]);
    }
    function toArray() {
        var l = arguments.length;
        var array = new Array(l);
        for (var i = 0; i < l; i++) {
            array[i] = arguments[i];
        }
        return array;
    }
    function fillSlot(array, index, fn) {
        return function(value) {
            array[index] = value;
            fn();
        };
    }
    function tryCatchResolver(resolver, resolve, reject) {
        try {
            resolver(resolve, reject);
        } catch (e) {
            reject(e);
        }
    }
    function tryCatchDeferred(deferred, fn, args) {
        return function() {
            try {
                var result = apply(fn, args);
                if (deferred.resolve === fn || deferred.reject === fn) { return; }
                doResolve.call(deferred, result);
            } catch (e) {
                deferred.reject(e);
            }
        };
    }

    var nextTick = typeof process !== 'undefined' && isFunction(process.nextTick) ? process.nextTick
     : typeof setImmediate !== 'undefined' ? setImmediate
     : function(fn) { setTimeout(fn, 0); };
    var defer = (function() {
        var queue = new Array(100);
        var l = 0;
        function flush() {
            for (var i = 0; i < l; i++) {
                queue[i]();
                queue[i] = null;
            }
            l = 0;
        }
        return function defer(fn) {
            queue[l] = fn;
            if (++l === 1) { nextTick(flush); }
        };
    })();

    function doResolve(x) {
        var deferred = this;
        var _reject = deferred.reject;
        var then;
        try {
            if (x === deferred.promise) {
                throw new TypeError('A promise cannot be fulfilled with itself');
            }
            if (isObject(x) && (then = x.then) && isFunction(then)) {
                var _resolve = function() {
                    _resolve = _reject = noop;
                    doResolve.apply(deferred, arguments);
                };
                _reject = function() {
                    _resolve = _reject = noop;
                    apply(deferred.reject, arguments);
                };
                then.call(
                    x,
                    function() { apply(_resolve, arguments); },
                    function() { apply(_reject, arguments); }
                );
            } else {
                apply(deferred.resolve, arguments);
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
