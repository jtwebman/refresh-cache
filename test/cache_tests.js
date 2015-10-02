'use strict';

var BPromise = require('bluebird');
var _ = require('lodash');
var expect = require('must');

var Cache = require('../cache');

function loadTests() {
  return [
    { id: 1, name: 'test 1' },
    { id: 2, name: 'test 2' },
    { id: 3, name: 'test 3' },
  ];
}

describe('Cache Tests', function() {

  it('loads and gets when calling get even before load',  function() {
    var cache = new Cache({
      loader: loadTests,
      getter: function(tests, id) {
        return _.find(tests, function(test) {
          return test.id === id;
        });
      }
    });

    // call get with key that the getter function uses
    return cache.get(2).then(function(testValue) {
      expect(testValue.id).to.equal(2);
      expect(testValue.name).to.equal('test 2');
    });
  });

  it('calling load then get pulls from cache without calling load again',  function() {
    var callCount = 0; // usedto count function calls

    function countingLoader() {
      callCount++;
      return loadTests();
    }

    var cache = new Cache({
      loader: countingLoader,
      getter: function(tests, id) {
        return _.find(tests, function(test) {
          return test.id === id;
        });
      }
    });

    return cache.reload().then(function() {
      return cache.get(2);
    }).then(function(testValue) {
      expect(testValue.id).to.equal(2);
      expect(testValue.name).to.equal('test 2');
      expect(callCount).to.equal(1);
    });
  });

  it('once load is called it calls load ever refresh time',  function() {
    var count = 0;
    var currentData = [];

    function appendTestLoader() {
      count++;
      currentData.push({ id: count, name: 'Test ' + count });
      return currentData;
    }

    var cache = new Cache({
      loader: appendTestLoader,
      ttl: 10 //sets refrest to 20 ms
    });

    return BPromise.delay(50).then(function() { // wait 100 ms
      return cache.get();
    }).then(function(testData) {
      // set timeout is exact sload was called at least 1 les then it should have been
      expect(testData.length).to.be.gte(4);
    });
  });

  it('calls timeout function if time taken is more then 1.5 ttl time',  function() {
    var loaderCallCount = 0;
    var callCount = 0;

    function delaySecondLoad() {
      loaderCallCount++;
      var data = loadTests();

      if (loaderCallCount == 2) { // delay call 15 ms to force a 1.5 greater then ttl
        return BPromise.delay(15).then(function() {
          return data;
        });
      } else { // return fast on fevery try besides try 2
      return data;
      }
    }

    var cache = new Cache({
      loader: delaySecondLoad,
      ttl: 10,
      timeoutCallback: function() {
        callCount++;
      }
    });

    return BPromise.delay(50).then(function() {
      expect(callCount).to.be.gt(0);
    });
  });

  it('not passing loader throws expection',  function() {
    var error;
    try {
      new Cache();
    } catch(ex) {
      error = ex;
    }
    expect(error).is.error('You must pass in an options with a loader function.');
  });

  it('passing a non number for ttl throws expection',  function() {
    var error;
    try {
      new Cache({ loader: loadTests, ttl: 'bad' });
    } catch(ex) {
      error = ex;
    }
    expect(error).is.error('The ttl option must be a number and greater than or equal to 0.');
  });

  it('passing a negitive number for ttl throws expection',  function() {
    var error;
    try {
      new Cache({ loader: loadTests, ttl: -1 });
    } catch(ex) {
      error = ex;
    }
    expect(error).is.error('The ttl option must be a number and greater than or equal to 0.');
  });

  it('passing a non function for getter throws expection',  function() {
    var error;
    try {
      new Cache({ loader: loadTests, getter: 'bad' });
    } catch(ex) {
      error = ex;
    }
    expect(error).is.error('The getter option must be a function.');
  });
});
