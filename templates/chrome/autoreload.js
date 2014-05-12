
/**
 * @file
 * Chrome extension autoreload.
 */

// @todo Replace with template name.
var watchurl = chrome.extension.getURL('dreditor.js');
var storage = chrome.storage.local;
var lastEtag, newEtag;

// @todo This is aynchronous...
storage.get('autoreload.etag', function (items) {
  lastEtag = items['autoreload.etag'];
});

/**
 * Performs a HEAD request to the specified watch URL to compare its ETag.
 *
 * Idea borrowed from Live.js.
 * @see http://livejs.com/
 */
setInterval(function () {
  console.log('HEAD ' + watchurl);

  var xhr = new XMLHttpRequest();
  xhr.open('HEAD', watchurl, true);
  xhr.onreadystatechange = function () {
    newEtag = xhr.getResponseHeader('etag');
    if (lastEtag != newEtag) {
      console.log('Reloading extension. ETag %s != %s', lastEtag, newEtag);
      storage.set({ 'autoreload.etag': newEtag });
      chrome.runtime.reload();
      // Execution ends here.
    }
  }
  xhr.send();

  // Use a reasonable timeout to pick up changes immediately.
  // An extension build takes ~1.1 sec.
  // Refreshing too fast may cause the manifest.json template to not be
  // post-processed yet.
  // @see Gruntfile.js
}, 1000);
