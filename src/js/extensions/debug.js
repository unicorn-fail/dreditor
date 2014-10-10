/**
 * Dreditor debugging helper.
 *
 * @usage
 *   $.debug(var [, name]);
 *   $variable.debug( [name] );
 */
jQuery.fn.extend({
  debug: function () {
    // Initialize window.debug storage, to make debug data accessible later
    // (e.g., via browser console). Although we are going to possibly store
    // named keys, this needs to be an Array, so we can determine its length.
    window.debug = window.debug || [];

    var name, data, args = jQuery.makeArray(arguments);
    // Determine data source; this is an object for $variable.debug().
    // Also determine the identifier to store data with.
    if (typeof this === 'object') {
      name = (args.length ? args[0] : window.debug.length);
      data = this;
    }
    else {
      name = (args.length > 1 ? args.pop() : window.debug.length);
      data = args[0];
    }
    // Store data.
    window.debug[name] = data;
    // Dump data into Firebug console.
    if (typeof window.console !== 'undefined') {
      window.console.log(name, data);
    }
    return this;
  }
});
