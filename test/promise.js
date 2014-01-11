"use strict";
var Promise = require('..');
var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
require('mocha-as-promised')();

describe('PJs', function() {

    describe('constructor', function() {
        it('returns an instance of the Promise class', function() {
            expect(new Promise(function() {})).to.be.instanceOf(Promise);
        });

        describe('resolve', function() {
            describe('when passed a thenable', function() {
                it('becomes resolved if thenable is resolved', function() {
                    return Promise.resolve(Promise.resolve(1)).then(function(value) {
                        expect(value).to.equal(1);
                    });
                });

                it('becomes rejected if thenable is rejected', function() {
                    return Promise.resolve(Promise.reject(1)).catch(function(value) {
                        expect(value).to.equal(1);
                    });
                });
            });
        });

        describe('reject', function() {
            describe('when passed a thenable', function() {
                it("rejects with thenable object if thenable is resolved", function() {
                    var resolved = Promise.resolve(1);
                    return Promise.reject(resolved).catch(function(value) {
                        expect(value).to.equal(resolved);
                    });
                });

                it("rejects with thenable object if thenable is rejected", function() {
                    var rejected = Promise.reject(1);
                    return Promise.reject(rejected).catch(function(value) {
                        expect(value).to.equal(rejected);
                    });
                });
            });
        });
    });

    describe('stack', function() {
        // https://github.com/jakearchibald/ES6-Promises/blob/5e7fb4e2c26204776a07b0fd89df74ab9d94ded5/test/tests/extension_test.js#L924-L971
        it('does not cause a recursive stack', function() {
            var iterations = 1000;
            var promise = Promise.resolve(0);
            var i = 0;

            function next(i) {
                return function(current) {
                    return Promise.resolve(current + i);
                };
            }
            for (i; i <= iterations; i++) {
                promise = promise.then(next(i));
            }

            return promise.then(function(value){
                expect(value).to.equal(iterations * (iterations + 1) / 2);
            });
        });
    });

    describe('.resolve', function() {
        function resolvesWith(resolution, description) {
            it('resolves with a ' + description, function() {
                return Promise.resolve(resolution).then(function(value) {
                    expect(value).to.equal(resolution);
                });
            });
        }

        resolvesWith({}, 'object');
        resolvesWith(1, 'number');
        resolvesWith(0, 'zero');
        resolvesWith(true, 'true');
        resolvesWith(false, 'false');
        resolvesWith(undefined, 'undefined');
        resolvesWith(null, 'null');
        resolvesWith(new Error(), 'error');
        resolvesWith('', 'blank string');

        describe('when passed a thenable', function() {
            it('becomes resolved if thenable is resolved', function() {
                return Promise.resolve(Promise.resolve(1)).then(function(value) {
                    expect(value).to.equal(1);
                });
            });

            it('becomes rejected if thenable is rejected', function() {
                return Promise.resolve(Promise.reject(1)).catch(function(value) {
                    expect(value).to.equal(1);
                });
            });
        });
    });

    describe('.reject', function() {
        function rejectsWith(rejection, description) {
            it('rejects with a ' + description, function() {
                return Promise.resolve(rejection).catch(function(value) {
                    expect(value).to.equal(rejection);
                });
            });
        }

        rejectsWith({}, 'object');
        rejectsWith(1, 'number');
        rejectsWith(0, 'zero');
        rejectsWith(true, 'true');
        rejectsWith(false, 'false');
        rejectsWith(undefined, 'undefined');
        rejectsWith(null, 'null');
        rejectsWith(new Error(), 'error');
        rejectsWith('', 'blank string');

        describe('when passed a thenable', function() {
            it("rejects with thenable object if thenable is resolved", function() {
                var resolved = Promise.resolve(1);
                return Promise.reject(resolved).catch(function(value) {
                    expect(value).to.equal(resolved);
                });
            });

            it("rejects with thenable object if thenable is rejected", function() {
                var rejected = Promise.reject(1);
                return Promise.reject(rejected).catch(function(value) {
                    expect(value).to.equal(rejected);
                });
            });
        });
    });

    describe('.cast', function() {
        it('returns promise if promise is an instanceof Promise', function() {
            var p = Promise.resolve(1);
            expect(Promise.cast(p)).to.equal(p);
        });

        it('when subclassed', function() {
            function SubClass() {}
            SubClass.prototype = Object.create(Promise.prototype);
            SubClass.prototype.constructor = SubClass;
            SubClass.cast = Promise.cast;

            it('returns promise if promise is an instanceof SubClass', function() {
                var p = new SubClass();
                expect(SubClass.cast(p)).to.equal(p);
            });

            it('returns new promise if promise is an instanceof Promise', function() {
                var p = Promise.resolve(1);
                expect(SubClass.cast(p)).not.to.equal(p);
            });
        });

        describe('when not instanceof Promise', function() {
            function resolvesWith(resolution, description) {
                it('resolves new promise with ' + description, function() {
                    var p = Promise.cast(resolution).then(function(value) {
                        expect(p).not.to.equal(resolution);
                        expect(value).to.equal(resolution);
                    });
                    return p;
                });
            }

            resolvesWith({}, 'object');
            resolvesWith(1, 'number');
            resolvesWith(0, 'zero');
            resolvesWith(true, 'true');
            resolvesWith(false, 'false');
            resolvesWith(undefined, 'undefined');
            resolvesWith(null, 'null');
            resolvesWith(new Error(), 'error');
            resolvesWith('', 'blank string');

            describe('when passed a thenable', function() {
                it('becomes resolved if thenable is resolved', function() {
                    return Promise.resolve(Promise.resolve(1)).then(function(value) {
                        expect(value).to.equal(1);
                    });
                });

                it('becomes rejected if thenable is rejected', function() {
                    return Promise.resolve(Promise.reject(1)).catch(function(value) {
                        expect(value).to.equal(1);
                    });
                });
            });
        });
    });

    describe('.all', function() {
        it('test');
    });
    describe('.race', function() {
        it('test');
    });

    describe('#throw', function() {
        xit('figure out how to test this...');
    });

    describe('#catch', function() {
        describe('when promise is resolved', function() {
            var p = Promise.resolve();
            it('is not called', function() {
                var spy = sinon.spy();
                return p.catch(spy).then(function() {
                    expect(spy).not.to.have.been.called;
                });
            });
        });

        describe('when promise is rejected', function() {
            var p = Promise.reject();
            it('is called', function() {
                var spy = sinon.spy();
                return p.catch(spy).then(function() {
                    expect(spy).to.have.been.called;
                });
            });

            it('return can fulfill promise', function() {
                var test = {};
                function returnTest() {
                    return test;
                }
                return p.catch(returnTest).then(function(value) {
                    expect(value).to.equal(test);
                });
            });

            it('return can reject promise', function() {
                var test = {};
                function returnTest() {
                    return Promise.reject(test);
                }
                return p.catch(returnTest).then(null, function(value) {
                    expect(value).to.equal(test);
                });
            });

            it('can throw to reject promise', function() {
                var test = new Error();
                function returnTest() {
                    throw test;
                }
                return p.catch(returnTest).then(null, function(value) {
                    expect(value).to.equal(test);
                });
            });
        });
    });
});
