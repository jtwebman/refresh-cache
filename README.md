# An Auto Refreshing Cache

[![Build Status](https://travis-ci.org/jtwebman/refresh-cache.svg?branch=master)](https://travis-ci.org/jtwebman/refresh-cache)

Do you have a databases query that you want to cache the results for a few
minutes? Do you have data in your system that only needs to be reloaded a few
times a day? Then this is the caching library for you.

All you have to do is get a new cache and pass it a loader function. It will
call the loader right away and keep calling it ever 5 minutes or whatever TTL
(Time To Live in milliseconds) you pass it in the options. Here is an example:

```Javascript
var Cache = require('refresh-cache');

var myCache = new Cache({
  loader: function() {
    //... load my data
    return data;
  },
  ttl: 1800000 // 30 minutes in ms
});

// The library uses promises so you will need to call .then to get the data
myCache.get().then(function(myData) {
  console.log(myData); //write out the data
});

// You can force a reload anytime by calling reload

// This will not wait for the data to reload but return after starting it
myCache.reload();

// This will wait for the reload and then fill the promise
myCache.reload().then(function() {
  // data is fully reloaded
});

```

If you want more complex get logic then getting all the data from load you can
pass a getter function on the options and get a single record for an array.

```Javascript
var Cache = require('refresh-cache');
var _ = require('lodash');

var myCache = new Cache({
  loader: function() {
    return {
      { id: 1, name: 'test 1' },
      { id: 2, name: 'test 2' },
      { id: 3, name: 'test 3' },
    };
  },
  ttl: 1800000, // 30 minutes in ms

  // getter gets the data as the first argument and then whatever you pass to get
  getter: function(tests, id) {
    return _.find(tests, function(test) {
      return test.id === id;
    });
  }
});P

// now you can call get passing in an id
myCache.get(2).then(function(test) {
  console.log(test); //write out { id: 2, name: 'test 2' }
});

```

For the most part the cache swallows errors so it is up to you to handle then.
The lastLoadError is a property on the cache but you can also pass an
errorCallback in on the options and it will be called for all errors. We use
the callback as the data refreshes in the background so you can log it however
you do it in your system.

```Javascript
var Cache = require('refresh-cache');

var myCache = new Cache({
  loader: function() {
    //... load my data but sometimes I fail
    return data;
  },
  errorCallback: function(err) {
    //Log my error
  }
});
```
Also as a side note if you are not using a loader that returns a promise the
exception might not always be caught. I would suggest wrapping you loader in
a try catch to handle issues there or using Bluebird library
Promise.promisify function.
