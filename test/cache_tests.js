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

  it('if load takes to long the error callback is called but data stays',  function() {
    var firstRun = true;
    var callCount = 0;

    function timeoutAfterFirstRunLoad() {
      var data = loadTests();

      if (!firstRun) { // delay call 500 ms
        return BPromise.delay(50).then(function() {
          return data;
        });
      } else { // first run return data
        firstRun = false;
        return data;
      }
    }

    var cache = new Cache({
      loader: timeoutAfterFirstRunLoad,
      ttl: 10, // 10 ms refresh
      timeout: 10, // timeout after 10 ms
      errorCallback: function() {
        callCount++;
      }
    });

    return BPromise.delay(50).then(function() {
      expect(callCount).to.be.gt(0);
    });
  });

  it('a loader that always errors sets lastLoadError and calls errorCallback', function() {
    var testerror;
    var cache = new Cache({
      loader: function() { throw new Error('I have an issue.'); },
      errorCallback: function(err) {
        testerror = err;
      }
    });

    return cache.get().then(function(data) {
      expect(cache.lastLoadError).is.error('I have an issue.');
      expect(testerror).is.error('I have an issue.');
    });
  });

  it('a loader that fails in promise on refresh load sets lastLoadError keeps reading old data', function() {
    var callCount = 0; // usedto count function calls

    function errorAfterFirstLoadLoader() {
      callCount++;
      if (callCount == 1) {
        return loadTests();
      } else {
        return BPromise.delay(5).then(function() {
          throw new Error('We have issues.');
        });
      }
    }

    var cache = new Cache({
      loader: errorAfterFirstLoadLoader,
      ttl: 10
    });

    return BPromise.delay(50).then(function() {
      return cache.get();
    }).then(function(data) {
      expect(data).to.be.an.array();
      expect(cache.lastLoadError).to.be.an.error('We have issues.');
    });
  });

  it('a loader that fails on refresh load sets lastLoadError keeps reading old data', function() {
    var callCount = 0; // usedto count function calls

    function errorAfterFirstLoadLoader() {
      callCount++;
      if (callCount == 1) {
        return loadTests();
      } else {
        throw new Error('We have issues.');
      }
    }

    var cache = new Cache({
      loader: errorAfterFirstLoadLoader,
      ttl: 10
    });

    return BPromise.delay(50).then(function() {
      return cache.get();
    }).then(function(data) {
      expect(data).to.be.an.array();
      expect(cache.lastLoadError).to.be.an.error('We have issues.');
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

  it('passing a non number for timeout throws expection',  function() {
    var error;
    try {
      new Cache({ loader: loadTests, timeout: 'bad' });
    } catch(ex) {
      error = ex;
    }
    expect(error).is.error('The timeout option must be a number and greater than or equal to 0.');
  });

  it('passing a negitive number for timeout throws expection',  function() {
    var error;
    try {
      new Cache({ loader: loadTests, timeout: -1 });
    } catch(ex) {
      error = ex;
    }
    expect(error).is.error('The timeout option must be a number and greater than or equal to 0.');
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
