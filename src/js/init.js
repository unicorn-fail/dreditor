/**
 * Initialize Dreditor.
 */
// Enable detection of installed chrome extension on dreditor.org.
if (window.location.href.match('dreditor.org')) {
  var isInstalledNode = document.createElement('div');
  isInstalledNode.id = 'dreditor-is-installed';
  document.body.appendChild(isInstalledNode);
}

jQuery(document).ready(function () {
  // If we are on a Drupal 7 site (i.e: not localize.drupal.org)
  if (Drupal.detachBehaviors) {
    Drupal.attachBehaviors(this);
  }
});

// Invoke Dreditor update check once.
Drupal.dreditor.updateCheck();
