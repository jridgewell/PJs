var Promise = require('../');
module.exports = {
    resolved: Promise.resolve,
    rejected: Promise.reject,
    deferred: Promise.deferred
};
