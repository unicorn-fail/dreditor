/**
 * Plugins library
 */

Drupal.dreditor.plugins = (function() {
  var plugins = [];

  // Register a new plugin.
  var register = function(plugin) {
    plugins.push(plugin);
  };


  // Initialize plugin manager.
  var init = function() {
    this.notify('init');
  };

  // Run all plugins
  var notify = function(event, data) {
    for (var i = 0; i < plugins.length; i++) {
      var plugin = plugins[i];

      if (plugin[event]) {
        plugin[event](data);
      }
    }
  };

  return {
    register: register,
    init: init,
    notify: notify
  };
})();
