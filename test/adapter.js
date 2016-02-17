'use strict';
var Promise = require('../');

var Adaptor = function() {
    Promise.apply(this, arguments);
};

Adaptor.prototype = Object.create(Promise.prototype, { constructor: { value: Adaptor } });
for (var prop in Promise) {
    if (Promise.hasOwnProperty(prop)) {
        Adaptor[prop] = Promise[prop];
    }
}
Adaptor._onPossiblyUnhandledRejection = function() {};

module.exports = {
    resolved: function(value) {
        return Adaptor.resolve(value);
    },
    rejected: function(reason) {
        return Adaptor.reject(reason);
    },
    deferred: function() {
        var deferred = {};
        deferred.promise = new Adaptor(function(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    }
};
