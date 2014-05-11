
/**
 * Checks for Dreditor updates every once in a while.
 */
Drupal.dreditor.updateCheck = function () {
  if (window.location.hostname === 'dreditor.org') {
    return;
  }
  // Do not update check for any webkit based browsers, they are extensions and
  // are automatically updated.
  if (jQuery.browser.webkit) {
    return;
  }

  var now = new Date();
  // Time of the last update check performed.
  var lastUpdateCheck = Drupal.storage.load('lastUpdateCheck');

  // Do not check for updates if the user just installed Dreditor.
  if (lastUpdateCheck === null) {
    Drupal.storage.save('lastUpdateCheck', now.getTime());
    return;
  }
  else {
    lastUpdateCheck = new Date(lastUpdateCheck);
  }

  // Check whether it is time to check for updates (one a week).
  var interval = 1000 * 60 * 60 * 24 * 7;
  // Convert to time; JS confuses timezone offset in ISO dates with seconds.
  if (lastUpdateCheck.getTime() + interval > now.getTime()) {
    return;
  }

  // Save that a update check was performed.
  // Was previously only saved when the user confirmed or when the commit log
  // could not be parsed. But if the user does not confirm (cancels), the update
  // would run on every page load again.
  Drupal.storage.save('lastUpdateCheck', now.getTime());

  var latestVersion, installedVersion = Drupal.dreditor.version;
  // Determine the latest tagged release from GitHub API.
  $.getJSON('https://api.github.com/repos/dreditor/dreditor/tags', function (json) {
    for (var i = 0; i < json.length; i++) {
      // Find the latest stable release (no "rc", "beta" or "dev" releases).
      if (json[i].name.indexOf('rc') === -1 && json[i].name.indexOf('beta') === -1 && json[i].name.indexOf('dev') === -1) {
        latestVersion = json[i].name;
        break;
      }
    }
    if (latestVersion > installedVersion) {
      if (window.confirm('A new version of Dreditor is available: ' + latestVersion + '. Your current installed version of Dreditor is: ' + installedVersion + '. Would you like to visit https://dreditor.org and update?')) {
        window.open('https://dreditor.org', 'dreditor');
      }
    }
    if (window.console) {
      window.console.log('Installed Dreditor version: ' + installedVersion);
      window.console.log('Latest Dreditor version: ' + latestVersion);
    }
  });
};
