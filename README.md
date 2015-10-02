# An Auto Refreshing Cache

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

// If you prefer just make the last argument you pass get a callback function
myCache.get(function(err, myData) {
  console.log(myData); //write out the data
});

// You can force a reload anytime by calling reload

// This will not wait for the data to reload but return after starting it
myCache.reload();

// This will wait for the reload and then fill the promise
myCache.reload().then(function() {
  // data is fully reloaded
});

// You can also pass a callback function if you prefer callbacks
myCache.reload(function(err) {
  if (err) {
    // do error case
  }
  // data is fully reloaded
})

```

If you want more complex get logic then getting all the data from load you can
pass a getter function on the options and get a single record for an array



I do use promises as
call reload and get are asynchronous calls but if you pass a function as the
last argument I will call it with a standard callback error, data.
