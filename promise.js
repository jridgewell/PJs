'use strict';
(function(root) {
    function noop() {}
    function identity(x) { return x; }
    function rejectIdentity(x) {
        return {
            then: function(_, reject) {
                reject(x);
            }
        };
    }
    function isFunction(fn) {
        return typeof fn === 'function';
    }
    function isObject(obj) {
        return obj && (typeof obj === 'object' || isFunction(obj));
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
        return partial(identity, x);
    }
    function getThen(obj) {
        var then;
        return (isObject(obj) && (then = obj.then) && isFunction(then) && then);
    }
    var defer = (function(queue) {
        function flush() {
            // Do **NOT** cache queue.length. It can change at any time.
            // We want it to change at any time.
            for (var i = 0; i < queue.length; i++) {
                queue[i]();
            }
            queue = [];
        }
        return function(fn) {
            var l = queue.push(fn);

            if (l === 1) {
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
            if ((then = getThen(x))) {
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

    function PendingHandler(queue) {
        function pendingHandler(onFulfilled, onRejected) {
            queue.push([
                this,
                assumeFunction(onFulfilled, identity),
                assumeFunction(onRejected, rejectIdentity)
            ]);
            return this.promise;
        }
        pendingHandler.queue = queue;
        pendingHandler.handle = handleQueue;
        return pendingHandler;
    }
    function handleQueue(handler) {
        var queue = this.queue;
        var tuple;
        for (var i = 0, l = queue.length; i < l; i++) {
            tuple = queue[i];
            handler.call(tuple[0], tuple[1], tuple[2]);
        }
    }


    function Promise(resolver) {
        var _value;
        var promise = this;
        this.then = function(onFulfilled, onRejected) {
            var deferred = Promise.deferred();
            return handler.call(deferred, onFulfilled, onRejected);
        };

        var handler = PendingHandler([]);

        function fulfilledHandler(onFulfilled) {
            return Handler.call(this, onFulfilled);
        }
        function rejectedHandler(_, onRejected) {
            return Handler.call(this, onRejected);
        }

        function Handler(fn) {
            if (!isFunction(fn)) { return promise; }
            var deferred = this;
            defer(function() {
                doResolve(deferred, partial(fn, _value));
            });
            return this.promise;
        }

        function setHandlerForPromise(newHandler) {
            return function(value) {
                _value = value;
                resolve = reject = noop;
                handler.handle(newHandler);
                handler = newHandler;
            };
        }
        var reject = setHandlerForPromise(rejectedHandler);
        var resolve = (function(_resolve, _reject) {
            var deferred = {
                promise: promise,
                resolve: _resolve,
                reject: _reject
            };
            return function(value) {
                resolve = reject = noop;
                doResolve(deferred, constant(value));
            };
        })(setHandlerForPromise(fulfilledHandler), reject);

        resolver(function(value) {
            resolve(value);
        }, function(reason) {
            reject(reason);
        });

        return promise;
    }

    Promise.prototype.catch = function(onRejected) {
        return this.then(void 0, onRejected);
    };

    Promise.prototype.throw = function(error) {
        return this.catch(function(err) {
            // Defer it, so our promise doesn't catch
            // it and turn it into a rejected promise.
            defer(function() {
                throw error || err || new Error('Uncaught promise rejection.');
            });
        });
    };

    Promise.resolve = function(value) {
        return new Promise(function(resolve) {
            resolve(value);
        });
    };

    Promise.reject = function(reason) {
        return new Promise(function(_, reject) {
            reject(reason);
        });
    };

    Promise.deferred = function() {
        var deferred = {};
        deferred.promise = new Promise(function(resolve, reject) {
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

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Promise;
        }
        exports.Promise = Promise;
    } else {
        root.Promise = Promise;
    }
})(this);
