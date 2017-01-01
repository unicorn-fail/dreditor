/**
 * Initialize Dreditor.
 */
// Enable detection of installed chrome extension on dreditor.org.
if (window.location.href.match('dreditor.org')) {
  var isInstalledNode = document.createElement('div');
  isInstalledNode.id = 'dreditor-is-installed';
  document.body.appendChild(isInstalledNode);
}

// Initialize communications with the page.
Drupal.dreditor.comms.init();

// Initialize all the plugins.
Drupal.dreditor.plugins.notify('init');
Drupal.dreditor.plugins.notify('bind');

// Invoke Dreditor update check once.
Drupal.dreditor.updateCheck();
