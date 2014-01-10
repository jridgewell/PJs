"use strict";
var Promise = require('..');
var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
require('mocha-as-promised')();

describe('PJs', function() {
    describe('#throw', function() {
        xit('figure out how to test this...');
    });

    describe('#catch', function() {
        describe('when promise is resolved', function() {
            var p = Promise.resolved();
            it('is not called', function() {
                var spy = sinon.spy();
                return p.catch(spy).then(function() {
                    expect(spy).not.to.have.been.called;
                });
            });
        });

        describe('when promise is rejected', function() {
            var p = Promise.rejected();
            it('is called', function() {
                var spy = sinon.spy();
                return p.catch(spy).then(function() {
                    expect(spy).to.have.been.called;
                });
            });

            it('return is used to fulfill/reject promise', function() {
                var test = {};
                function returnTest() {
                    return test;
                }
                return p.catch(returnTest).then(function(value) {
                    expect(value).to.equal(test);
                });
            });
        });
    });
});
