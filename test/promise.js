"use strict";
var Promise = require('..');
var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
require('mocha-as-promised')();

var slice = Array.prototype.slice;
function constant(x) {
    return function() {
        return x;
    };
}
function expectArray(array) {
    return function() {
        expect(slice.call(arguments)).to.include.members(array);
    };
}

describe('PJs', function() {

    describe('constructor', function() {
        it('returns an instance of the Promise class', function() {
            expect(new Promise(function() {})).to.be.instanceOf(Promise);
        });

        describe('resolve', function() {
            it('can be fulfilled with multiple values', function() {
                return Promise.resolve(1, 2, 3).
                    then(expectArray([1, 2, 3]));
            });

            describe('when passed a thenable', function() {
                it('becomes fulfilled if thenable is fulfilled', function() {
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
            it('can be rejected with multiple values', function() {
                return Promise.reject(1, 2, 3).
                    then(null, expectArray([1, 2, 3]));
            });

            describe('when passed a thenable', function() {
                it("rejects with thenable object even if thenable is fulfilled", function() {
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

    describe('#then', function() {
        var resolved = Promise.resolve(1, 2, 3);
        var rejected = Promise.reject(1, 2, 3);
        describe('when resolved', function() {
            it('can be fulfilled with a promise with multiple values', function() {
                return Promise.resolve().
                    then(constant(resolved)).
                    then(expectArray([1, 2, 3]));
            });

            it('can be rejected with a promise with multiple values', function() {
                return Promise.resolve().
                    then(constant(rejected)).
                    then(null, expectArray([1, 2, 3]));
            });
        });
        describe('when rejected', function() {
            it('can be fulfilled with a promise with multiple values', function() {
                return Promise.reject().
                    then(null, constant(resolved)).
                    then(expectArray([1, 2, 3]));
            });

            it('can be rejected with a promise with multiple values', function() {
                return Promise.reject().
                    then(null, constant(rejected)).
                    then(null, expectArray([1, 2, 3]));
            });
        });
    });

    describe('.resolve', function() {
        function fulfillsWith(resolution, description) {
            it('fulfills with a ' + description, function() {
                return Promise.resolve(resolution).then(function(value) {
                    expect(value).to.equal(resolution);
                });
            });
        }

        fulfillsWith({}, 'object');
        fulfillsWith(1, 'number');
        fulfillsWith(0, 'zero');
        fulfillsWith(true, 'true');
        fulfillsWith(false, 'false');
        fulfillsWith(undefined, 'undefined');
        fulfillsWith(null, 'null');
        fulfillsWith(new Error(), 'error');
        fulfillsWith('', 'blank string');

        describe('when passed a thenable', function() {
            it('becomes fulfilled if thenable is fulfilled', function() {
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
                return Promise.reject(rejection).catch(function(value) {
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
            it("rejects with thenable object even if thenable is fulfilled", function() {
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

        describe('when subclassed', function() {
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
            function fulfillsWith(resolution, description) {
                it('fulfills new promise with ' + description, function() {
                    var p = Promise.cast(resolution).then(function(value) {
                        expect(p).not.to.equal(resolution);
                        expect(value).to.equal(resolution);
                    });
                    return p;
                });
            }

            fulfillsWith({}, 'object');
            fulfillsWith(1, 'number');
            fulfillsWith(0, 'zero');
            fulfillsWith(true, 'true');
            fulfillsWith(false, 'false');
            fulfillsWith(undefined, 'undefined');
            fulfillsWith(null, 'null');
            fulfillsWith(new Error(), 'error');
            fulfillsWith('', 'blank string');

            describe('when passed a thenable', function() {
                it('becomes fulfilled if thenable is fulfilled', function() {
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
        it('fulfills with empty array if empty array passed', function() {
            return Promise.all([]).then(function(array) {
                expect(array).to.be.instanceOf(Array);
                expect(array).to.be.empty;
            });
        });

        describe('when passed promises', function() {
            it('fulfills with array of correct size', function() {
                return Promise.all([Promise.resolve(1), Promise.resolve(2)]).then(function(array) {
                    expect(array.length).to.equal(2);
                });
            });

            it('fulfills with array of fulfilled values', function() {
                return Promise.all([Promise.resolve(1), Promise.resolve(2)]).then(function(array) {
                    expect(array).to.include.members([1, 2]);
                });
            });

            it('rejects if promise rejects', function() {
                return Promise.all([Promise.resolve(1), Promise.reject(2)]).catch(function(reason) {
                    expect(reason).to.equal(2);
                });
            });
        });

        describe('when passed a value', function() {
            it('fulfills with array of correct size', function() {
                return Promise.all([1, 2]).then(function(array) {
                    expect(array.length).to.equal(2);
                });
            });

            it('fulfills with array of fulfilled values', function() {
                return Promise.all([1, 2]).then(function(array) {
                    expect(array).to.include.members([1, 2]);
                });
            });
        });

        describe('when passed a mixture of promises and values', function() {
            it('fulfills with array of correct size', function() {
                return Promise.all([1, Promise.resolve(2)]).then(function(array) {
                    expect(array.length).to.equal(2);
                });
            });

            it('fulfills with array of fulfilled values', function() {
                return Promise.all([1, Promise.resolve(2)]).then(function(array) {
                    expect(array).to.include.members([1, 2]);
                });
            });

            it('rejects if promise rejects', function() {
                return Promise.all([1, Promise.reject(2)]).catch(function(reason) {
                    expect(reason).to.equal(2);
                });
            });
        });
    });
    describe('.race', function() {
        it('returns unresolved promise if empty array passed', function(done) {
            var calledCount = 0;
            function incCallCount() { ++calledCount; }
            Promise.race([]).then(incCallCount, incCallCount);

            setTimeout(function() {
                expect(calledCount).to.equal(0);
                done();
            }, 20);
        });

        describe('when passed promises', function() {
            it('fulfills with first promise to fulfill', function() {
                var p1 = new Promise(function(resolve) {
                    setTimeout(function() { resolve(1); }, 100);
                });
                var p2 = Promise.resolve(2);
                return Promise.race([p1, p2]).then(function(value) {
                    expect(value).to.equal(2);
                });
            });

            it('rejects with first promise to reject', function() {
                var p1 = new Promise(function(_, reject) {
                    setTimeout(function() { reject(1); }, 100);
                });
                var p2 = Promise.reject(2);
                return Promise.race([p1, p2]).catch(function(value) {
                    expect(value).to.equal(2);
                });
            });

            it('either fulfills or rejects with value of first promise', function() {
                var p1 = new Promise(function(_, reject) {
                    setTimeout(function() { reject(1); }, 100);
                });
                return Promise.race([p1, Promise.resolve(2)]).then(function(value) {
                    expect(value).to.equal(2);
                });
            });
        });

        describe('when passed a value', function() {
            it('fulfills with first value', function() {
                return Promise.race([1, 2]).then(function(value) {
                    expect(value).to.equal(1);
                });
            });
        });

        describe('when passed a mixture of promises and values', function() {
            describe('when value comes first', function() {
                it('fulfills with value', function() {
                    return Promise.race([1, Promise.resolve(2)]).then(function(value) {
                        expect(value).to.equal(1);
                    });
                });

                it('fulfills with value, even if promise rejects', function() {
                    return Promise.race([1, Promise.reject(2)]).then(function(value) {
                        expect(value).to.equal(1);
                    });
                });
            });

            describe('when promise comes first', function() {
                describe('when promise is already resolved', function() {
                    it('fulfills with value of promise', function() {
                        return Promise.race([Promise.resolve(1), 2]).then(function(value) {
                            expect(value).to.equal(1);
                        });
                    });

                    it('rejects with reason of promise', function() {
                        return Promise.race([Promise.reject(1), 2]).catch(function(reason) {
                            expect(reason).to.equal(1);
                        });
                    });
                });

                describe('when promise is not resolved', function() {
                    it('fulfills with first value', function() {
                        var p1 = Promise.resolve().then(function() { return 1; });
                        return Promise.race([p1, 2]).then(function(value) {
                            expect(value).to.equal(2);
                        });
                    });

                    it('fulfills with first value, even when promise rejects', function() {
                        var p1 = Promise.resolve().then(function() { throw 1; });
                        return Promise.race([p1, 2]).then(function(value) {
                            expect(value).to.equal(2);
                        });
                    });
                });
            });

            it('rejects with first to reject', function() {
                var p1 = new Promise(function(_, reject) {
                    setTimeout(function() { reject(1); }, 100);
                });
                var p2 = Promise.reject(2);
                return Promise.race([p1, p2]).catch(function(value) {
                    expect(value).to.equal(2);
                });
            });

            it('either resolves or rejects with value of first promise', function() {
                var p1 = new Promise(function(_, reject) {
                    setTimeout(function() { reject(1); }, 100);
                });
                return Promise.race([p1, Promise.resolve(2)]).then(function(value) {
                    expect(value).to.equal(2);
                });
            });
        });
    });

    describe('#throw', function() {
        xit('figure out how to test this...');
    });

    describe('#catch', function() {
        describe('when promise is fulfilled', function() {
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
