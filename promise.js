(function(root) {
    'use strict';

    /**
     * @constructor
     * @param {function(function(*=), function (*=))} resolver
     */
    function Promise(resolver) {
        if (!(this instanceof Promise)) {
            throw new TypeError('Constructor Promise requires `new`');
        }
        if (!isFunction(resolver)) {
            throw new TypeError('Must pass resolver function');
        }

        this._state = PendingPromise;
        this._value = [];

        doResolve(
            this,
            adopter(this, FulfilledPromise),
            adopter(this, RejectedPromise),
            [{ then: resolver }]
        );
    }

    /****************************
     Public Instance Methods
     ****************************/

    /**
     * @param {function(*)} onFulfilled
     * @param {function(*)} onRejected
     */
    Promise.prototype.then = function(onFulfilled, onRejected) {
        onFulfilled = isFunction(onFulfilled) ? onFulfilled : void 0;
        onRejected = isFunction(onRejected) ? onRejected : void 0;

        return this._state(
            this._value,
            onFulfilled,
            onRejected
        );
    };

    /**
     * @param {function(*)} onRejected
     * @returns {!Promise}
     */
    Promise.prototype.catch = function(onRejected) {
        return this.then(void 0, onRejected);
    };

    /****************************
     Public Static Methods
     ****************************/

    /**
     * @param {*=} value
     * @returns {!Promise}
     */
    Promise.resolve = function(value) {
        if (isObject(value) && value instanceof this) {
            return /** @type {!Promise} */(value);
        }

        var values = toArray.apply(void 0, arguments);
        return new this(function(resolve) {
            apply(resolve, values);
        });
    };

    /**
     * @param {*=} reason
     * @returns {!Promise}
     */
    Promise.reject = function(reason) {
        var reasons = toArray.apply(void 0, arguments);
        return new this(function(_, reject) {
            apply(reject, reasons);
        });
    };

    /**
     * @param {!Array<Promise|*>} promises
     * @returns {!Promise}
     */
    Promise.all = function(promises) {
        var Constructor = this;
        return new Constructor(function(resolve, reject) {
            var length = promises.length;
            var values = new Array(length);

            if (length === 0) {
                return resolve(values);
            }

            each(promises, function(promise, index) {
                Constructor.resolve(promise).then(function(value) {
                    values[index] = value;
                    if (--length === 0) {
                        resolve(values);
                    }
                }, reject);
            });
        });
    };

    /**
     * @param {!Array<Promise|*>} promises
     * @returns {!Promise}
     */
    Promise.race = function(promises) {
        var Constructor = this;
        return new Constructor(function(resolve, reject) {
            for (var i = 0; i < promises.length; i++) {
                Constructor.resolve(promises[i]).then(resolve, reject);
            }
        });
    };

    /****************************
      Private functions
     ****************************/

    function FulfilledPromise(value, onFulfilled, _, deferred) {
        if (!onFulfilled) { return this; }
        if (!deferred) {
            deferred = new Deferred(this.constructor);
        }
        defer(tryCatchDeferred(deferred, onFulfilled, value));
        return deferred.promise;
    }

    function RejectedPromise(reason, _, onRejected, deferred) {
        if (!onRejected) { return this; }
        if (!deferred) {
            deferred = new Deferred(this.constructor);
        }
        defer(tryCatchDeferred(deferred, onRejected, reason));
        return deferred.promise;
    }

    function PendingPromise(queue, onFulfilled, onRejected, deferred) {
        if (!onFulfilled && !onRejected) { return this; }
        if (!deferred) {
            deferred = new Deferred(this.constructor);
        }
        queue.push({
            deferred: deferred,
            onFulfilled: onFulfilled || deferred.resolve,
            onRejected: onRejected || deferred.reject
        });
        return deferred.promise;
    }

    function Deferred(Promise) {
        var deferred = this;
        this.promise = new Promise(function(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    }

    function adopt(promise, state, value) {
        var queue = promise._value;
        promise._state = state;
        promise._value = value;

        for (var i = 0; i < queue.length; i++) {
            var next = queue[i];
            promise._state(
                value,
                next.onFulfilled,
                next.onRejected,
                next.deferred
            );
        }
    }
    function adopter(promise, state) {
        return function(value) {
            var values = toArray.apply(void 0, arguments);
            return adopt(promise, state, values);
        };
    }

    function noop() {}
    function isFunction(fn) {
        return typeof fn === 'function';
    }
    function isObject(obj) {
        return obj === Object(obj);
    }
    function each(collection, iterator) {
        for (var i = 0; i < collection.length; i++) {
            iterator(collection[i], i);
        }
    }
    function apply(fn, args) {
        return args.length > 1 ? fn.apply(void 0, args)
            : args.length === 1 ? fn(args[0])
            : fn();
    }
    function toArray() {
        var array = new Array(arguments.length);
        for (var i = 0; i < arguments.length; i++) {
            array[i] = arguments[i];
        }
        return array;
    }
    function tryCatchDeferred(deferred, fn, args) {
        var promise = deferred.promise;
        var resolve = deferred.resolve;
        var reject = deferred.reject;
        return function() {
            try {
                var result = apply(fn, args);
                if (resolve === fn || reject === fn) {
                    return;
                }
                doResolve(promise, resolve, reject, [result], result);
            } catch (e) {
                reject(e);
            }
        };
    }

    var nextTick = typeof setImmediate !== 'undefined' ? setImmediate
      : function(fn) { setTimeout(fn, 0); };

    var defer = (function() {
        var queue = new Array(16);
        var length = 0;

        function flush() {
            for (var i = 0; i < length; i++) {
                var fn = queue[i];
                queue[i] = null;
                fn();
            }
            length = 0;
        }

        return function defer(fn) {
            if (length === 0) { nextTick(flush); }
            queue[length++] = fn;
        };
    })();

    function doResolve(promise, resolve, reject, values, context) {
        var value = values.length > 0 ? values[0] : void 0;
        var _reject = reject;
        var then, _resolve;
        try {
            if (value === promise) {
                throw new TypeError('Cannot fulfill promise with itself');
            }
            var isObj = isObject(value);
            if (isObj && value instanceof promise.constructor) {
                adopt(promise, value._state, value._value);
            } else if (isObj && (then = value.then) && isFunction(then)) {
                _resolve = function(value) {
                    _resolve = _reject = noop;
                    var values = toArray.apply(void 0, arguments);
                    doResolve(promise, resolve, reject, values, value);
                };
                _reject = function() {
                    _resolve = _reject = noop;
                    reject.apply(void 0, arguments);
                };
                then.call(
                    context,
                    function(value) { _resolve.apply(void 0, arguments); },
                    function(reason) { _reject.apply(void 0, arguments); }
                );
            } else {
                apply(resolve, values);
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
