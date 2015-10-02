'use strict';

// 5 minutes in ms is the default refresh ttl
var DEFAULT_TTL = 300000;

// 30 seconds in ms is the default load timeout
var DEFAULT_TIMEOUT = 30000;

var BPromise = require('bluebird');
var _ = require('lodash');

function handleError(cache, err) {
  cache.lastLoadError = err;
  if (cache.options.errorCallback) {
    cache.options.errorCallback(err);
  }

  return cache;
}

function callLoader(cache) {
  try {
    return BPromise.resolve(cache.options.loader());
  } catch(ex) {
    return BPromise.reject(ex);
  }
}

function load(cache) {
  if (!cache.loadPromise || !cache.loadPromise.isPending()) {
    var startTime = process.hrtime();

    cache.loadPromise = callLoader(cache)
    .timeout(cache.options.timeout)
    .then(function(loadData) {
      cache.lastLoadRunTime = process.hrtime(startTime)[1]/1000000;
      cache.data = loadData;
      return cache;
    }).catch(function(err) {
      cache = handleError(cache, err);
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

  options.ttl = options.ttl || DEFAULT_TTL;

  if (options.timeout && (typeof options.timeout !== 'number' || options.timeout < 0) ) {
    throw new Error('The timeout option must be a number and greater than or equal to 0.');
  }

  options.timeout = options.timeout || DEFAULT_TIMEOUT;

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

  cache.reload = function(cb) {
    return load(cache);
  };

  return cache;
}

module.exports = Cache;
