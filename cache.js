'use strict';

// 5 minutes in ms is the default refresh ttl
var DEFAULT_TTL = 300000;

// 30 seconds in ms is the default load timeout
var DEFAULT_TIMEOUT = 30000;

function handleError(cache, err) {
  cache.lastLoadError = err;
  if (cache.options.errorCallback) {
    cache.options.errorCallback(err);
  }

  return cache;
}

function load(cache, cb) {
  if (!cache.loading) {
    cache.loading = true;

    var timeoutProtect = setTimeout(function() {
      timeoutProtect = null;
      cache.loading = false;
      handleError(cache, new Error('Cache loading timeout hit at ' + cache.options.timeout + 'ms.'));
    }, cache.options.timeout);

    try {
      cache.options.loader(function(err, loadData) {
        if (timeoutProtect) {
          clearTimeout(timeoutProtect);
          cache.loading = false;
          if (err) {
            handleError(cache, err);
            if (cb) cb(err);
          } else {
            cache.data = loadData;
            if (cb) cb(null, loadData);
          }
        }
      });
    } catch (err) {
      clearTimeout(timeoutProtect);
      cache.loading = false;
      handleError(cache, err);
      if (cb) cb(err);
    }
  }
}

function getData(cache, args) {
  var cb = null;
  try {
    cb = args.pop();

    if (typeof cb !== 'function') {
      throw new Error('Last parameter needs to be a callback function.');
    }

    var waitLock = setInterval(function() {
      if (!cache.loading) {
        clearInterval(waitLock);

        if (!cache.data && cache.lastLoadError) {
          cb(cache.lastLoadError);
        } else {
          if (cache.options.getter) {
            args.unshift(cache.data);
            args.push(cb);
            return cache.options.getter.apply(null, args);
          } else {
            return cb(null, cache.data);
          }
        }
      }
    }, 0);

  } catch(err) {
    if (cb) {
      cb(err);
    } else {
       throw(err);
    }
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

  return {
    get: function() {
      var args = [].slice.call(arguments);
      return getData(cache, args);
    },

    reload: function(cb) {
      return load(cache, cb);
    }
  };
}

module.exports = Cache;
