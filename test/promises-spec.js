var tests = require('promises-aplus-tests');
var Adaptor = require('./adapter');

tests.mocha({
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
});
