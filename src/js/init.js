/**
 * Initialize Dreditor.
 */
// Enable detection of installed chrome extension on dreditor.org.
if (window.location.href.match('dreditor.org')) {
  var isInstalledNode = document.createElement('div');
  isInstalledNode.id = 'dreditor-is-installed';
  document.body.appendChild(isInstalledNode);
}

// Load jQuery UI if necessary.
if (window.jQuery !== undefined && window.jQuery.fn.jquery >= '1.4.4' && window.jQuery.ui === undefined) {
  var jqueryui_script = document.createElement('script');
  jqueryui_script.setAttribute('type', 'text/javascript');
  jqueryui_script.setAttribute("src", '//ajax.googleapis.com/ajax/libs/jqueryui/1.8.6/jquery-ui.min.js');
  (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(jqueryui_script);
  var jqueryui_style = document.createElement('link');
  jqueryui_style.setAttribute('type', 'text/css');
  jqueryui_style.setAttribute('rel', 'stylesheet');
  jqueryui_style.setAttribute('href', '//ajax.googleapis.com/ajax/libs/jqueryui/1.8.6/themes/base/jquery-ui.css');
  (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(jqueryui_style);
}

jQuery(document).ready(function () {
  Drupal.attachBehaviors(this);
});

// Invoke Dreditor update check once.
Drupal.dreditor.updateCheck();
