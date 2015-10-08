'use strict';

var _ = require('lodash');
var expect = require('must');

var Cache = require('../cache');

function loadTests(cb) {
  cb(null, [
    { id: 1, name: 'test 1' },
    { id: 2, name: 'test 2' },
    { id: 3, name: 'test 3' },
  ]);
}

describe('Cache Tests', function() {

  it('loads and gets when calling get even before load',  function(done) {
    var cache = new Cache({
      loader: loadTests,
      getter: function(tests, id, cb) {
        cb(null, _.find(tests, function(test) {
          return test.id === id;
        }));
      }
    });

    // call get with key that the getter function uses
    return cache.get(2, function(err, testValue) {
      expect(err).to.be.null();
      expect(testValue.id).to.equal(2);
      expect(testValue.name).to.equal('test 2');
      done();
    });
  });

  it('calling load then get pulls from cache without calling load again',  function(done) {
    var callCount = 0; // usedto count function calls

    function countingLoader(cb) {
      callCount++;
      return loadTests(cb);
    }

    var cache = new Cache({
      loader: countingLoader,
      getter: function(tests, id, cb) {
        cb(null, _.find(tests, function(test) {
          return test.id === id;
        }));
      }
    });

    return cache.reload(function(err) {
      expect(err).to.be.null();
      return cache.get(2, function(err, testValue) {
        expect(err).to.be.null();
        expect(testValue.id).to.equal(2);
        expect(testValue.name).to.equal('test 2');
        expect(callCount).to.equal(2);
        done();
      });
    });
  });

  it('once load is called it calls load ever refresh time',  function(done) {
    var count = 0;
    var currentData = [];

    function appendTestLoader(cb) {
      count++;
      currentData.push({ id: count, name: 'Test ' + count });
      cb(null, currentData);
    }

    var cache = new Cache({
      loader: appendTestLoader,
      ttl: 10 //sets refrest to 20 ms
    });

    setTimeout(function() {
      return cache.get(function(err, testData) {
        expect(err).to.be.null();
        expect(testData.length).to.be.gte(4);
        done();
      });
    }, 50);
  });

  it('if load takes to long the error callback is called but data stays',  function(done) {
    var firstRun = true;
    var callCount = 0;

    function timeoutAfterFirstRunLoad(cb) {
      loadTests(function(err, data) {
        expect(err).to.be.null();

        if (!firstRun) { // delay call 50 ms
          setTimeout(function() {
            cb(null, data);
          }, 50);
        } else { // first run return data
          firstRun = false;
          cb(null, data);
        }
      });
    }

    var cache = new Cache({
      loader: timeoutAfterFirstRunLoad,
      ttl: 10, // 10 ms refresh
      timeout: 10, // timeout after 10 ms
      errorCallback: function() {
        callCount++;
      }
    });

    setTimeout(function() {
      expect(callCount).to.be.gt(0);
      done();
    }, 50);
  });

  it('erroring loader calls errorCallback and calls to get return the err', function(done) {
    var testerror;
    var cache = new Cache({
      loader: function(cb) { cb(new Error('I have an issue.')); },
      errorCallback: function(err) {
        testerror = err;
      }
    });

    return cache.get(function(err, data) {
      expect(err).is.error('I have an issue.');
      expect(testerror).is.error('I have an issue.');
      done();
    });
  });

  it('if load happened without an error at least once will return data on get', function(done) {
    var callCount = 0; // usedto count function calls

    function errorAfterFirstLoadLoader(cb) {
      callCount++;
      if (callCount == 1) {
        return loadTests(cb);
      } else {
        throw new Error('We have issues.');
      }
    }

    var cache = new Cache({
      loader: errorAfterFirstLoadLoader,
      ttl: 10
    });

    setTimeout(function() {
      return cache.get(function(err, data) {
        expect(err).to.be.null();
        expect(data).to.be.an.array();
        done();
      });
    }, 50);
  });
/* Working on this
  it('calling reload mutiple times only reloads once', function(done) {
    var cache = new Cache({
      loader: loadTests,
      getter: function(tests, id, cb) {
        cb(null, _.find(tests, function(test) {
          return test.id === id;
        }));
      }
    });

    // call get with key that the getter function uses
    return cache.get(2, function(err, testValue) {
      expect(err).to.be.null();
      expect(testValue.id).to.equal(2);
      expect(testValue.name).to.equal('test 2');
      done();
    });
  });
*/
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
