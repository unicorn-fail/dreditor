
/**
 * @file
 * Dreditor update check.
 *
 * This file is occasionally (rarely) loaded from drupalcode.org directly
 * (working around crossdomain security limitations) to check the date of the
 * last commit in the repository.
 */

(function ($, undefined) {

// @todo Don't nag too often when users don't wanna update.

var lastUpdate = Drupal.storage.load('lastUpdate');
$.debug(lastUpdate);

// Don't bug to update on very first, initial check.
if (0 && lastUpdate == null) {
  lastUpdate = new Date();
  Drupal.storage.save('lastUpdate', lastUpdate.getTime());
}
else {
  lastUpdate = new Date(lastUpdate);
}
$.debug(lastUpdate);

// Prepare variables outside of XHR scope.
var lastChange, doUpdate;

function checkUpdate() {
var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function () {
  console.log(xhr);
  if (xhr.readyState == 4 && xhr.status == 200) {
    alert(xhr.responseText);
//    console.log('responseText', xhr.responseText);
    if (xhr.responseText != null) {
      alert("IN");
//      console.log("IN");
      lastChange = $(xhr.responseText).find('#metadata_lchange td:last');
      alert(xhr.lastChange);
//      console.log('last change', xhr.lastChange);
      if (lastChange.length) {
        lastChange = new Date(lastChange.text());
        alert(xhr.lastChange);
//        console.log('lastChange', xhr.lastChange);
        if (lastChange > lastUpdate) {
          doUpdate = window.confirm('A new version of Dreditor is available. Shall we visit the project page to update?');
          if (doUpdate) {
            window.open('//drupal.org/project/dreditor', 'dreditor');
          }
        }
      }
    }
    // Update the stored timestamp if the user confirmed.
    if (doUpdate) {
      Drupal.storage.save('lastUpdate', lastChange.getTime());
    }
  }
};
// Request needs to be synchronous, as we need the value of doUpdate below.
xhr.open('GET', '//drupalcode.org/project/dreditor.git', true);
//xhr.open('GET', '//drupalcode.org/project/dreditor.git/shortlog/refs/heads/master', false);
//xhr.open('GET', '//drupalcode.org/project/dreditor.git/commit/refs/heads/master', false);
xhr.send(null);

}

setTimeout(checkUpdate, 0);

})(jQuery)
