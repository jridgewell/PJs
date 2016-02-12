import Promise from '../../src/promise';
import tests from 'promises-aplus-tests';

Promise._onPossiblyUnhandledRejection = function() {};

tests.mocha({
  resolved: function(value) {
    return Promise.resolve(value);
  },

  rejected: function(reason) {
    return Promise.reject(reason);
  },

  deferred: function() {
    var deferred = {};
    deferred.promise = new Promise(function(resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });

    return deferred;
  }
});
