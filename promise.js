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
        return typeof obj === 'object' || isFunction(obj);
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
    var defer = process && isFunction(process.nextTick) ? process.nextTick
        : setImmediate ? setImmediate
        : function(fn) { setTimeout(fn, 0); };

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
                return rejectPromise(new TypeError('A promise cannot be resolved with itself.'));
            }
            if (x && isObject(x) && (then = x.then) && isFunction(then)) {
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

    function PJs(fn) {
        var _value;
        var promise = {
            // Changes the value of the returned promise
            then: function(onFulfilled, onRejected) {
                var deferred = PJs.deferred();
                return handler.call(deferred, onFulfilled, onRejected);
            }
        };

        var handler = PendingHandler([]);

        function resolvedHandler(onFulfilled) {
            return Handler.call(this, onFulfilled);
        }
        function rejectedHandler(_, onRejected) {
            return Handler.call(this, onRejected);
        }

        function Handler(fn) {
            if (!isFunction(fn)) { return promise; }
            var doResolveDeferred = partial(doResolve, this);
            defer(function() {
                doResolveDeferred(partial(fn, _value));
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

        var resolve = setHandlerForPromise(resolvedHandler);
        var reject = setHandlerForPromise(rejectedHandler);

        fn(function(value) {
            resolve(value);
        }, function(reason) {
            reject(reason);
        });

        return promise;
    }

    PJs.resolved = function(value) {
        return PJs(function(resolve) {
            resolve(value);
        });
    };

    PJs.rejected = function(reason) {
        return PJs(function(_, reject) {
            reject(reason);
        });
    };

    PJs.deferred = function() {
        var deferred = {};
        deferred.promise = PJs(function(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    };

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = PJs;
        }
        exports.PJs = PJs;
    } else {
        root.PJs = PJs;
    }
})(this);
