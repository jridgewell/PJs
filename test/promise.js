var Promise = require('./adapter');

var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

chai.use(require('sinon-chai'));

describe('PJs', function() {
    var noop = function() {};

    beforeEach(function() {
        Promise._overrideUnhandledExceptionHandler(noop);
    });

    describe('constructor', function() {
        it('returns an instance of the Promise class', function() {
            expect(new Promise(function() {})).to.be.instanceOf(Promise);
        });

        describe('resolve', function() {
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

    describe('._overrideUnhandledExceptionHandler', function() {
        var Promise;
        beforeEach(function() {
            Promise = require('./adapter');
        });

        it('is called when a rejected promise does not have a onRejected', function() {
            return new Promise(function(resolve) {
                Promise._overrideUnhandledExceptionHandler(resolve);
                Promise.reject();
            });
        });

        it('is not called when a rejected promise already has a onRejected', function() {
            var rejectP;
            new Promise(function(_, reject) {
                rejectP = reject;
            }).catch(function() {});

            return new Promise(function(resolve, reject) {
                Promise._overrideUnhandledExceptionHandler(reject);
                setTimeout(resolve, 100);
                rejectP();
            });
        });

        it('is not called when a rejected promise gets a onRejected', function() {
            var p = Promise.reject();
            return new Promise(function(resolve, reject) {
                Promise._overrideUnhandledExceptionHandler(reject);
                setTimeout(resolve, 100);
                p.catch(function() {});
            });
        });

        describe('when a rejected promise is adopted', function() {
            it('is called regardless of promise chain', function() {
                var resolveP;
                new Promise(function(resolve) {
                    resolveP = resolve;
                }).then(function() {
                    return Promise.reject(1);
                }).catch(function() {});

                return new Promise(function(resolve, reject) {
                    Promise._overrideUnhandledExceptionHandler(resolve);
                    resolveP();
                });
            });
        });

        describe('when rejection happens in the middle of a chain', function() {
            it('is called when the end promise does not have a onRejected', function() {
                return new Promise(function(resolve) {
                    Promise._overrideUnhandledExceptionHandler(resolve);
                    Promise.resolve().then(function() {
                        throw 1;
                    }).then(function() {
                        return 2;
                    });
                });
            });

            it('is not called when the end promise already has a onRejected', function() {
                var resolveP;
                new Promise(function(resolve) {
                    resolveP = resolve;
                }).then(function() {
                    throw 1;
                }).then(function() {
                    return 2;
                }).catch(function() {});

                return new Promise(function(resolve, reject) {
                    Promise._overrideUnhandledExceptionHandler(reject);
                    setTimeout(resolve, 100);
                    resolveP();
                });
            });

            it('is not called when the end promise gets a onRejected', function() {
                var p = Promise.resolve(1).then(function() {
                    throw 1;
                }).then(function() {
                    return 2;
                });

                return new Promise(function(resolve, reject) {
                    Promise._overrideUnhandledExceptionHandler(reject);
                    setTimeout(resolve, 100);
                    p.catch(function() {});
                });
            });
        });
    });

    describe('.resolve', function() {
        it('returns promise if promise is an instanceof Promise', function() {
            var p = Promise.resolve(1);
            expect(Promise.resolve(p)).to.equal(p);
        });

        describe('when subclassed', function() {
            function SubClass() {}
            SubClass.prototype = Object.create(Promise.prototype);
            SubClass.prototype.constructor = SubClass;
            SubClass.resolve = Promise.resolve;

            it('returns promise if promise is an instanceof SubClass', function() {
                var p = new SubClass();
                expect(SubClass.resolve(p)).to.equal(p);
            });

            it('returns new promise if promise is an instanceof Promise', function() {
                var p = Promise.resolve(1);
                expect(SubClass.resolve(p)).not.to.equal(p);
            });
        });
        function fulfillsWith(resolution, description) {
            it('fulfills with a ' + description, function() {
                return Promise.resolve(resolution).then(function(value) {
                    expect(value).to.equal(resolution);
                });
            });
        }

        describe('when not instanceof Promise', function() {
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

    describe('#catch', function() {
        describe('when promise is fulfilled', function() {
            var p;
            beforeEach(function() {
                p = Promise.resolve();
            });

            it('is not called', function() {
                var spy = sinon.spy();
                return p.catch(spy).then(function() {
                    expect(spy).not.to.have.been.called;
                });
            });
        });

        describe('when promise is rejected', function() {
            var p;
            beforeEach(function() {
                p = Promise.reject();
            });

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
                return p.catch(returnTest).catch(function(value) {
                    expect(value).to.equal(test);
                });
            });

            it('can throw to reject promise', function() {
                var test = new Error();
                function returnTest() {
                    throw test;
                }
                return p.catch(returnTest).catch(function(value) {
                    expect(value).to.equal(test);
                });
            });
        });
    });
});
