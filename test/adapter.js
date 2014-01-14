'use strict';
var Promise = require('../');
module.exports = {
    resolved: function(value) {
        return Promise.resolve(value);
    },
    rejected: function(reason) {
        return Promise.reject(reason);
    },
    deferred: function() {
        return Promise.deferred();
    }
};
