'use strict';
(function(root) {
    /****************************
     Public Constructor
     ****************************/

    function Promise(resolver) {
        var _value;
        var promise = this;

        this.then = function(onFulfilled, onRejected) {
            var deferred = Promise.deferred();
            return intermediateHandler.call(promise, deferred, _value, onFulfilled, onRejected);
        };

        var intermediateHandler = new PendingHandler();

        function setNewHandler(newHandler) {
            intermediateHandler.handle(newHandler, _value);
            intermediateHandler = newHandler;
        }

        var reject = function(reason) {
            resolve = reject = noop;
            _value = reason;
            setNewHandler(rejectedHandler);
        };
        var resolve = function(value) {
            var deferred = {
                promise: promise,
                reject: reject,
                resolve: function(value) {
                    _value = value;
                    setNewHandler(fulfilledHandler);
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
        var deferred = {};
        deferred.promise = new this(function(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    };

    Promise.cast = function(obj) {
        if (obj && isObject(obj) && obj.constructor === this) {
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
            return fn.call(void 0, arg1, arg2);
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

    function PendingHandler() {
        var queue = [];
        function pendingHandler(deferred, _, onFulfilled, onRejected) {
            queue.push([
                deferred,
                assumeFunction(onFulfilled, identity),
                assumeFunction(onRejected, rejectIdentity)
            ]);
            return deferred.promise;
        }
        pendingHandler.handle = queueHandle(queue);
        return pendingHandler;
    }
    function queueHandle(queue) {
        return function(handler, value) {
            var tuple;
            for (var i = 0, l = queue.length; i < l; i++) {
                tuple = queue[i];
                handler(tuple[0], value, tuple[1], tuple[2]);
            }
        };
    }
    function fulfilledHandler(deferred, value, onFulfilled) {
        if (!isFunction(onFulfilled)) { return this; }
        defer(function() {
            doResolve(deferred, partial(onFulfilled, value));
        });
        return deferred.promise;
    }
    function rejectedHandler(deferred, value, _, onRejected) {
        if (!isFunction(onRejected)) { return this; }
        defer(function() {
            doResolve(deferred, partial(onRejected, value));
        });
        return deferred.promise;
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
