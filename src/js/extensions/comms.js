/**
 * Handle communications between content script and pages.
 */

Drupal.dreditor.comms = (function () {
  // Script to be injected into page.
  var pageScript = function () {
    // Content scripts get run, and this gets injected, for all requests,
    // including POST and ajax requests. Don't run unless we're on a real page.
    if (typeof Drupal === 'undefined') {
      return;
    }

    // Tell dreditor when Drupal.attachBehaviors gets fired.
    Drupal.behaviors.dreditorListener = {
      attach: function () {
        window.postMessage({behavior: true, event: 'attach'}, '*');
      },

      detach: function(context, settings, trigger) {
        window.postMessage({behavior: true, event: 'detach', trigger: trigger}, '*');
      }
    };
  };

  // Inject the page script that communicates with the content script.
  var injectScript = function() {
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.textContent = '(' + pageScript.toString() + ')();';

    // Inject the SCRIPT element into the page.
    var head = document.getElementsByTagName('head')[0];
    head.appendChild(script);
  };

  // Listen for messages sent from page script.
  var listen = function() {
    window.addEventListener('message', function(event) {
      var data = event.data;

      // Rerun plugins when page content changes via Drupal AJAX.
      if (data.behavior) {
        if (data.event === 'attach') {
          Drupal.attachBehaviors(document);
        }

        if (data.event === 'detach') {
          Drupal.detachBehaviors(document, {}, data.trigger);
        }
      }
    });
  };

  // Initialize content script <> page script communications.
  var init = function() {
    injectScript();
    listen();
  };

  return {
    init: init
  };
})();
