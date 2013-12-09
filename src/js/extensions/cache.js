/**
 * Mimic of d.o. cache_get cache_set and cache_clear
 *
 * Note we only have only a key/value store so there is no cache table.
 * We store each key/value pair prepending it's key with the cache id.
 * - cache_node/1 for node id in the default cache
 */
Drupal.cache = {
  /**
   * Provide a default value if needed
   *
   * @param {String} cache
   *   Cache ID or nothing
   * @returns {String}
   *   Cache ID
   */
  getCache : function(cache) {
    return cache ? cache : 'cache';
  },
  /**
   * The key to use for storage.
   *
   * @param {String} cache
   * @param {String} id
   * @returns {String}
   */
  getKey : function(cache, id) {
    return cache + '_' + id;
  },
  /**
   * List of key for particular cache.
   *
   * @param {String} cache
   * @returns {Array}
   */
  getKeys : function(cache) {
    cache = this.getCache(cache);
    var keys = Drupal.storage.load(cache);
    return keys ? keys : [];
  },

  /**
   * Store a key/value pair in a particular cache maybe expirable.
   *
   * @param {String} id
   * @param {any} data
   *   Data item to store
   * @param {String} cache
   *   Named cache bin
   * @param {integer} expire
   *   Value Data.now() + millisecond or CACHE_PERMANENT === 0
   *
   * @see https://api.drupal.org/api/drupal/includes!cache.inc/function/cache_set/7
   */
  set : function(id, data, cache, expire) {
    cache = this.getCache(cache);
    expire = expire || 0;
    // Prepend key with it's cache
    var key = this.getKey(cache, id);
    // Grab lookup for comparing keys
    var keys = this.getKeys(cache);
    if (keys.indexOf(key) === -1) {
      keys.push(key);
    }
    // Save both cachekeys and cachable data @see Drupal.cache
    var item = {data: data, expire: expire};
    Drupal.storage.save(key, item);
    Drupal.storage.save(cache, keys);
  },
  /**
   * Get item from particular cache with given id.
   *
   * @param {String} id
   * @param {String} cache
   * @returns {any|null}
   */
  get : function(id, cache) {
    cache = this.getCache(cache);
    var keys = this.getKeys(cache);
    var key = this.getKey(cache, id);
    if (keys.indexOf(key) > -1) {
      var item = Drupal.storage.load(key);
      if (item.expire === 0 || item.expire > Date.now()) {
        return item.data;
      }
    }
    return null;
  },
  /**
   * Clears the given (or default) cache
   *
   * @param {String|null} cache
   */
  clear : function(cache) {
    cache = this.getCache(cache);
    var keys = this.getKeys(cache);
    // Delete data.
    $.each(keys, function(i, value) {
      Drupal.storage.remove(value);
    });
    // Remove the cache itself.
    Drupal.storage.remove(cache);
  }
};
