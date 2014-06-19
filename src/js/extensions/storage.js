/**
 * Drupal HTML5 storage handler.
 *
 * @see https://www.drupal.org/node/65578
 */
Drupal.storage = {};

/**
 * Checks support for a client-side data storage bin.
 *
 * @param bin
 *   The space to store in, one of 'session', 'local', 'global'.
 */
Drupal.storage.isSupported = function (bin) {
  try {
    return bin + 'Storage' in window && window[bin + 'Storage'] !== null;
  }
  catch (e) {
    return false;
  }
};

Drupal.storage.support = {
  session: Drupal.storage.isSupported('session'),
  local: Drupal.storage.isSupported('local'),
  global: Drupal.storage.isSupported('global')
};

/**
 * Loads data from client-side storage.
 *
 * @param key
 *   The key name to load stored data from. Automatically prefixed with
 *   "Dreditor.".
 * @param bin
 *   (optional) A string denoting the storage space to read from. Defaults to
 *   'local'. See Drupal.storage.save() for details.
 *
 * @return {any}
 *   The data stored or null.
 *
 * @see Drupal.storage.save()
 */
Drupal.storage.load = function (key, bin) {
  if (typeof bin === 'undefined') {
    bin = 'local';
  }
  if (!Drupal.storage.support[bin]) {
    return false;
  }
  key = 'Dreditor.' + key;
  var item = window[bin + 'Storage'].getItem(key);
  if (item) {
    return window.JSON.parse(item);
  }
  return null;
};

/**
 * Stores data on the client-side.
 *
 * @param key
 *   The key name to store data under. Automatically prefixed with "Dreditor.".
 *   Should be further namespaced by module; e.g., for
 *   "Dreditor.moduleName.settingName" you pass "moduleName.settingName".
 * @param data
 *   The data to store.
 * @param bin
 *   (optional) A string denoting the storage space to store data in:
 *   - session: Reads from window.sessionStorage. Persists for currently opened
 *     browser window/tab only.
 *   - local: Reads from window.localStorage. Stored values are only available
 *     within the scope of the current host name only.
 *   - global: Reads from window.globalStorage.
 *   Defaults to 'local'.
 *
 * @return {Boolean}
 *   Indicates saving succeded or not.
 * @see Drupal.storage.load()
 */
Drupal.storage.save = function (key, data, bin) {
  if (typeof bin === 'undefined') {
    bin = 'local';
  }
  if (!Drupal.storage.support[bin]) {
    return false;
  }
  key = 'Dreditor.' + key;
  window[bin + 'Storage'].setItem(key, window.JSON.stringify(data));
  return true;
};

/**
 * Delete data from client-side storage.
 *
 * Called 'remove', since 'delete' is a reserved keyword.
 *
 * @param key
 *   The key name to delete. Automatically prefixed with "Drupal.".
 * @param bin
 *   (optional) The storage space name. Defaults to 'session'.
 *
 * @see Drupal.storage.save()
 */
Drupal.storage.remove = function (key, bin) {
  if (typeof bin === 'undefined') {
    bin = 'local';
  }
  if (!Drupal.storage.support[bin]) {
    return false;
  }
  key = 'Dreditor.' + key;
  return window[bin + 'Storage'].removeItem(key);
};

/**
 * Parses a stored value into its original data type.
 *
 * HTML5 storage always stores values as strings. This is a "best effort" to
 * restore data type sanity.
 */
Drupal.storage.parse = function (val) {
  // Convert numbers.
  if (/^[0-9.]+$/.test(val)) {
    val = parseFloat(val);
  }
  // Convert booleans.
  else if (val === 'true') {
    val = true;
  }
  else if (val === 'false') {
      val = false;
    }
  return val;
};

/**
 * Serializes a value suitable for client-side (string) storage.
 */
Drupal.storage.serialize = function (val) {
  return $.param(val);
};

/**
 * Unserializes a $.param() string.
 *
 * Note that this only supports simple values (numbers, booleans, strings)
 * and only an one-dimensional (flat) associative configuration object (due to
 * limitations of jQuery.param()).
 */
Drupal.storage.unserialize = function (str) {
  var obj = {};
  jQuery.each(str.split('&'), function() {
    var splitted = this.split('=');
    if (splitted.length !== 2) {
      return;
    }
    var key = decodeURIComponent(splitted[0]);
    var val = decodeURIComponent(splitted[1].replace(/\+/g, ' '));
    val = Drupal.storage.parse(val);

    // Ignore empty values.
    if (typeof val === 'number' || typeof val === 'boolean' || val.length > 0) {
      obj[key] = val;
    }
  });
  return obj;
};
