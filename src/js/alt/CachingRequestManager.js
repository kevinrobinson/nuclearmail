/** @flow */

var RSVP = require('rsvp');

// Makes requests, reading from a cache first if possible and filling it afterward
// on success.  There's a global expiration policy, wrapped up in the cache, which
// only needs #get(key) and #set(key, value).
//
// TODO(kr) Allow requesters to set the freshness they need from the data on a per-request
// basis.
module.exports = class CachingRequestManager {
  constructor(cache: Object) {
    this.cache = cache;
  }

  requestWithCache(requestFn, requestOptions, options: ?Object):Promise<any> {
    var keyFn = options && options.keyFn ? options.keyFn : JSON.stringify;
    var cacheKey = keyFn(requestOptions);
    var cachedValue = this.cache.get(cacheKey);
    if (cachedValue) {
      return Promise.resolve(cachedValue);
    }

    var liveRequestPromise = requestFn(requestOptions);
    liveRequestPromise.then(cacheableValue => {
      this.cache.set(cacheKey, cacheableValue)
    });
    return liveRequestPromise;
  }
}
