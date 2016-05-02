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
Adaptor._overrideUnhandledExceptionHandler(function() {});

module.exports = Adaptor;
