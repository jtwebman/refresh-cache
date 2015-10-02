'use strict';

// 5 minutes in ms is the default timeout if one isn't passed
var DEFAULT_REFRESH_TIME = 300000;

var BPromise = require('bluebird');
var _ = require('lodash');

function load(cache) {
  if (!cache.loadPromise || cache.loadPromise.isFulfilled()) {
    cache.loadPromise = BPromise.resolve(cache.options.loader())
    .then(function(loadData) {
      cache.data = loadData;

      // if we have a timeout callback funcion track timeouts
      if (cache.options.timeoutCallback) {
        if (cache.lastLoadTime) {
          cache.lastLoadDiff = process.hrtime(cache.lastLoadTime)[1]/1000000;
          if (cache.lastLoadDiff > (cache.options.ttl * 1.5)) {
            cache.options.timeoutCallback();
          }
        }
        cache.lastLoadTime = process.hrtime();
      }

      return cache;
    });
  }

  return cache.loadPromise;
}

function getData(cache, args) {
  if (!cache.data) {
    return cache.loadPromise.then(function(loadedCache) {
      return callGetter(loadedCache, args);
    });
  }

  return BPromise.resolve(cache).then(function(loadedCache) {
    return callGetter(loadedCache, args);
  });
}

function callGetter(cache, args) {
  if (cache.options.getter) {
    args.unshift(cache.data);
    return cache.options.getter.apply(null, args);
  } else {
    return cache.data;
  }
}


function Cache(options) {
  var cache = {};

  if (!options || typeof options.loader !== 'function') {
    throw new Error('You must pass in an options with a loader function.');
  }

  if (options.ttl && (typeof options.ttl !== 'number' || options.ttl < 0) ) {
    throw new Error('The ttl option must be a number and greater than or equal to 0.');
  }

  options.ttl = options.ttl || DEFAULT_REFRESH_TIME;

  if (options.getter && typeof options.getter !== 'function') {
    throw new Error('The getter option must be a function.');
  }

  cache.options = options;

  load(cache);
  cache.intervalId = setInterval(function() { load(cache); }, options.ttl);

  cache.get = function() {
    var args = [].slice.call(arguments);
    return getData(cache, args);
  };

  cache.reload = function() {
    return load(cache);
  };

  return cache;
}

module.exports = Cache;
