// ==UserScript==
// @name           Dreditor
// @namespace      http://dreditor.org
// @description    A user script for drupal.org. Improves the user experience and functionality for Drupal contributors and power users.
// @icon           https://drupal.org/misc/druplicon.png
// @author         sun (Daniel F. Kudwien)
// @version        1.2.1
// @grant          none
// @include        *://dreditor.org/*
// @include        *://*.dreditor.org/*
// @include        *://drupal.org/*
// @include        *://*.drupal.org/*
// @include        *://devdrupal.org/*
// @include        *://*.devdrupal.org/*
// ==/UserScript==

/**
 * Content Scope Runner.
 *
 * While Firefox/GreaseMonkey supports advanced DOM manipulations, Chrome does
 * not. For maximum browser compatibility, this user script injects itself into
 * the page it is executed on.
 *
 * Support and available features for user scripts highly varies across browser
 * vendors. Some browsers (e.g., Firefox) require to install a browser extension
 * (GreaseMonkey) in order to install and execute user scripts. Some others
 * have built-in support for user scripts, but do not support all features of
 * GreaseMonkey (variable storage, cross-domain XHR, etc). In the special case
 * of Chrome, user scripts are executed before the DOM has been fully loaded and
 * initialized; they can only access and manipulate the plain DOM document as
 * is, but none of the scripts on the actual page are loaded yet.
 *
 * Bear in mind, with Content Scope Runner, unsafeWindow and all other
 * GreaseMonkey specific features are not available.
 *
 * The global __PAGE_SCOPE_RUN__ variable is prepended to the user script to
 * control execution. Make sure this variable does not clash with actual page
 * variables.
 *
 * @see http://userscripts.org/scripts/show/68059
 * @see http://wiki.greasespot.net/Content_Scope_Runner
 *
 * @todo FIXME upstream:
 *   - Bogus SCRIPT type attribute.
 *   - data attribute throws MIME type warning in Chrome; textContent approach
 *     of earlier versions is correct.
 *   - Append to HEAD.
 *   - Removal/clean-up is completely invalid.
 *   - setTimeout() approach seems useless?
 *   - Code comments.
 */
var dreditor_loader = function ($) {

/**
 * @defgroup jquery_extensions jQuery extensions
 * @{
 */

/**
 * Dreditor debugging helper.
 *
 * @usage
 *   $.debug(var [, name]);
 *   $variable.debug( [name] );
 */
jQuery.extend({
  debug: function () {
    // Initialize window.debug storage, to make debug data accessible later
    // (e.g., via browser console). Although we are going to possibly store
    // named keys, this needs to be an Array, so we can determine its length.
    window.debug = window.debug || [];

    var args = jQuery.makeArray(arguments);
    // Determine data source; this is an object for $variable.debug().
    // Also determine the identifier to store data with.
    if (typeof this == 'object') {
      var name = (args.length ? args[0] : window.debug.length);
      var data = this;
    }
    else {
      var name = (args.length > 1 ? args.pop() : window.debug.length);
      var data = args[0];
    }
    // Store data.
    window.debug[name] = data;
    // Dump data into Firebug console.
    if (console !== undefined) {
      console.log(name, data);
    }
    return this;
  }
});
// @todo Is this the right way?
jQuery.fn.debug = jQuery.debug;

/**
 * sort() callback to sort DOM elements by their actual DOM position.
 *
 * Copied from jQuery 1.3.2.
 *
 * @see Drupal.dreditor.patchReview.sort()
 */
var sortOrder, hasDuplicate;
if ( document.documentElement.compareDocumentPosition ) {
  sortOrder = function( a, b ) {
    var ret = a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
    if ( ret === 0 ) {
      hasDuplicate = true;
    }
    return ret;
  };
} else if ( "sourceIndex" in document.documentElement ) {
  sortOrder = function( a, b ) {
    var ret = a.sourceIndex - b.sourceIndex;
    if ( ret === 0 ) {
      hasDuplicate = true;
    }
    return ret;
  };
} else if ( document.createRange ) {
  sortOrder = function( a, b ) {
    var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
    aRange.selectNode(a);
    aRange.collapse(true);
    bRange.selectNode(b);
    bRange.collapse(true);
    var ret = aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
    if ( ret === 0 ) {
      hasDuplicate = true;
    }
    return ret;
  };
}
// end sortOrder

Drupal.dreditor = {
  version: '1.2.1',
  behaviors: {},
  setup: function (context) {
    var self = this;

    // Reset scroll position.
    delete self.scrollTop;

    // Prevent repeated setup (not supported yet).
    if (self.$dreditor) {
      self.show();
      return false;
    }
    // Setup Dreditor overlay.
    self.$wrapper = $('<div id="dreditor-wrapper"></div>').css({ height: 0 });
    // Add Dreditor content area.
    self.$dreditor = $('<div id="dreditor"></div>').appendTo(self.$wrapper);
    self.$wrapper.appendTo('body');

    // Setup Dreditor context.
    Drupal.dreditor.context = self.$dreditor.get(0);

    // Add sidebar.
    var $bar = $('<div id="bar"></div>').prependTo(self.$dreditor);
    // Add ul#menu to sidebar by default for convenience.
    $('<h3>Diff outline</h3>').appendTo($bar);
    $('<ul id="menu"></ul>').appendTo($bar);

    // Add content region.
    var $content = $('<div id="dreditor-content"></div>').appendTo(self.$dreditor);

    // Do not check for updates if the user just installed Dreditor.
    var barWidth = Drupal.storage.load('barWidth');
    if (barWidth == null) {
      Drupal.storage.save('barWidth', $bar.width());
    }

    $bar.css('width', barWidth);
    $content.css('marginLeft', ($bar.outerWidth() - 1));

    // Make bar/content resizeable
    $bar.resizable({
      handles: 'e',
      minWidth: 230,
      resize: function(e, ui) {
        $content.css('marginLeft', (ui.element.outerWidth() - 1));
      },
      stop: function(e, ui) {
        Drupal.storage.save('barWidth', ui.element.width());
      }
    });

    // Add global Dreditor buttons container.
    var $actions = $('<div id="dreditor-actions"></div>');
    // Add hide/show button to temporarily dismiss Dreditor.
    $('<input id="dreditor-hide" class="dreditor-button" type="button" value="Hide" />')
      .click(function () {
        self.visible ? self.hide() : self.show();
      })
      .appendTo($actions);
    // Add cancel button to tear down Dreditor.
    $('<input id="dreditor-cancel" class="dreditor-button" type="button" value="Cancel" />')
      .click(function () {
        if (Drupal.dreditor.patchReview.comment.comments.length == 0 || confirm('Do you really want to cancel Dreditor and discard your changes?')) {
          Drupal.dreditor.tearDown(context);
        }
        return false;
      })
      .appendTo($actions);
    $actions.appendTo(self.$dreditor);

    // Allow to hide Dreditor using the ESC key.
    $(document).bind('keyup', { dreditor: self }, self.escapeKeyHandler);

    // Setup application.
    var args = arguments;
    // Cut out the application name (2nd argument).
    this.application = Array.prototype.splice.call(args, 1, 1)[0];
    // Remove global window context; new context is added by attachBehaviors().
    args = Array.prototype.slice.call(args, 1);
    this.attachBehaviors(args);

    // Display Dreditor.
    self.show();
  },

  tearDown: function (context) {
    var self = this;

    // Remove the ESC keyup event handler that was bound in self.setup().
    $(document).unbind('keyup', self.escapeKeyHandler);

    self.$wrapper.animate({ height: 0 }, 300, function(){
      $(this).hide();
      $('body', context).css({ overflow: 'auto' });
    });
    setTimeout(function(){
      self.$wrapper.stop(true, true).css('height', 0).remove();
      delete self.$dreditor;
      delete self.$wrapper;
    }, 500);
  },

  /**
   * Dreditor visibility state.
   */
  visible: false,

  /**
   * Hide Dreditor.
   */
  hide: function () {
    var self = this;
    self.visible = false;
    // Backup current vertical scroll position of Dreditor content.
    self.scrollTop = self.$dreditor.find('#dreditor-content').scrollTop();

    var button = self.$dreditor.find('#dreditor-hide').get(0);
    button.value = 'Show';

    self.$wrapper.stop(true).animate({ height: 34 }, function () {
      self.$dreditor.find('> div:not(#dreditor-actions)').hide();
      $('body').css({ overflow: 'auto' });
    });
    return false;
  },

  /**
   * Show Dreditor.
   */
  show: function () {
    var self = this;
    self.visible = true;

    var button = self.$dreditor.find('#dreditor-hide').get(0);
    self.$dreditor.find('> div:not(#dreditor-actions)').show();

    $('body').css({ overflow: 'hidden' });
    self.$wrapper.stop(true).animate({ height: '100%' }, function () {
      button.value = 'Hide';
    });

    // Restore previous vertical scroll position of Dreditor content.
    if (self.scrollTop) {
      self.$dreditor.find('#dreditor-content').scrollTop(self.scrollTop);
    }
    return false;
  },

  /**
   * Key event handler to hide or show Dreditor.
   */
  escapeKeyHandler: function (event) {
    var self = event.data.dreditor;
    if (event.which == 27) {
      self.visible ? self.hide() : self.show();
    }
  },

  attachBehaviors: function (args) {
    if (args === undefined || typeof args != 'object') {
      args = [];
    }
    // Add Dreditor context as first argument.
    Array.prototype.unshift.call(args, Drupal.dreditor.context);
    // Apply application behaviors, passing any additional arguments.
    $.each(Drupal.dreditor[this.application].behaviors, function () {
      this.apply(Drupal.dreditor.context, args);
    });
    // Apply Dreditor behaviors.
    $.each(Drupal.dreditor.behaviors, function () {
      this(Drupal.dreditor.context);
    });
    // Apply Drupal behaviors.
    Drupal.attachBehaviors(Drupal.dreditor.context);
  },

  /**
   * Parse CSS classes of a DOM element into parameters.
   *
   * Required, because jQuery.data() somehow seems to forget about previously
   * stored data in DOM elements; most probably due to context mismatches.
   *
   * Syntax for CSS classes is "<prefix>-name-value".
   *
   * @param element
   *   A DOM element containing CSS classes to parse.
   * @param prefix
   *   The parameter prefix to search for.
   */
  getParams: function(element, prefix) {
    var classes = element.className.split(' ');
    var length = prefix.length;
    var params = {};
    for (var i in classes) {
      if (classes[i].substr(0, length + 1) == prefix + '-') {
        var parts = classes[i].split('-');
        var value = parts.slice(2).join('-');
        params[parts[1]] = value;
        // Convert numeric values.
        if (parseInt(value, 10) == value) {
          params[parts[1]] = parseInt(value, 10);
        }
      }
    }
    return params;
  },

  /**
   * Jump to a fragment/hash in the document, skipping the browser's history.
   *
   * To be used for jump links within Dreditor overlay only.
   */
  goto: function (selector) {
    if (!(typeof selector == 'string' && selector.length)) {
      return;
    }
    // @todo Does not work because of overflow: hidden.
    //window.scrollTo(0, $(selector).offset().top);
    // Gecko-only method to scroll DOM elements into view.
    // @see https://developer.mozilla.org/en/DOM/element.scrollIntoView
    var $target = $(selector);
    if ($target.length) {
      $target.get(0).scrollIntoView();
    }
    else if (typeof console.warn == 'function') {
      console.warn(selector + ' does not exist.');
    }
  },

  /**
   * Redirect to a given path or the current page.
   *
   * Avoids hard browser refresh (clearing cache).
   *
   * @param path
   *   (optional) The path to redirect to, including leading slash. Defaults to
   *   current path.
   * @param options
   *   (optional) An object containing:
   *   - query: A query string to append, including leading question mark
   *     (window.location.search). Defaults to current query string.
   *   - fragment: A fragment string to append, including leading pound
   *     (window.location.hash). Defaults to none.
   */
  redirect: function (path, options) {
    path = path || window.location.pathname;
    options = $.extend({ fragment: '' }, options || {});
    var url = window.location.protocol + '//' + window.location.hostname + path;
    // If query is not null, take it; otherwise, use current.
    url += (typeof options.query != 'undefined' ? options.query : window.location.search);
    // Not using current fragment by default.
    if (options.fragment.length) {
      url += options.fragment;
    }
    window.location.href = url;
    return false;
  }
};

/**
 * Drupal HTML5 storage handler.
 *
 * @see http://drupal.org/node/65578
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
 * @see Drupal.storage.save()
 * @see Drupal.storage.unserialize()
 */
Drupal.storage.load = function (key, bin) {
  if (typeof bin == 'undefined') {
    bin = 'local';
  }
  if (!Drupal.storage.support[bin]) {
    return false;
  }
  key = 'Dreditor.' + key;
  return Drupal.storage.parse(window[bin + 'Storage'].getItem(key));
};

/**
 * Stores data on the client-side.
 *
 * @param key
 *   The key name to store data under. Automatically prefixed with "Dreditor.".
 *   Should be further namespaced by module; e.g., for
 *   "Dreditor.moduleName.settingName" you pass "moduleName.settingName".
 * @param data
 *   The data to store. Note that window storage only supports strings, so data
 *   should be a scalar value (integer, float, string, or Boolean). For
 *   non-scalar values, use Drupal.storage.serialize() before saving and
 *   Drupal.storage.unserialize() after loading data.
 * @param bin
 *   (optional) A string denoting the storage space to store data in:
 *   - session: Reads from window.sessionStorage. Persists for currently opened
 *     browser window/tab only.
 *   - local: Reads from window.localStorage. Stored values are only available
 *     within the scope of the current host name only.
 *   - global: Reads from window.globalStorage.
 *   Defaults to 'local'.
 *
 * @see Drupal.storage.load()
 * @see Drupal.storage.serialize()
 */
Drupal.storage.save = function (key, data, bin) {
  if (typeof bin == 'undefined') {
    bin = 'local';
  }
  if (!Drupal.storage.support[bin]) {
    return false;
  }
  key = 'Dreditor.' + key;
  window[bin + 'Storage'].setItem(key, data);
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
  if (typeof bin == 'undefined') {
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
  else if (val == 'true') {
    val = true;
  }
  else if (val == 'false') {
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
    if (splitted.length != 2) {
      return;
    }
    var key = decodeURIComponent(splitted[0]);
    var val = decodeURIComponent(splitted[1].replace(/\+/g, ' '));
    val = Drupal.storage.parse(val);

    // Ignore empty values.
    if (typeof val == 'number' || typeof val == 'boolean' || val.length > 0) {
      obj[key] = val;
    }
  });
  return obj;
};

/**
 * Checks for Dreditor updates every once in a while.
 */
Drupal.dreditor.updateCheck = function () {
  // Do not update check for any webkit based browsers, they are extensions and
  // are automatically updated.
  if (jQuery.browser.webkit) {
    return;
  }

  var now = new Date();
  // Time of the last update check performed.
  var lastUpdateCheck = Drupal.storage.load('lastUpdateCheck');

  // Do not check for updates if the user just installed Dreditor.
  if (lastUpdateCheck == null) {
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

/**
 * @defgroup form_api JavaScript port of Drupal Form API
 * @{
 */

Drupal.dreditor.form = {
  forms: [],

  create: function (form_id) {
    return new this.form(form_id);
  }
};

Drupal.dreditor.form.form = function (form_id) {
  var self = this;

  // Turn this object into a jQuery object, being a form. :)
  $.extend(true, self, $('<form id="' + form_id + '"></form>'));

  // Override the default submit handler.
  self.submit(function (e) {
    // Unless proven wrong, we remove the form after submission.
    self.remove();
    // We never really submit.
    return false;
  });
};

Drupal.dreditor.form.form.prototype = {
  submitHandlers: {},

  addButton: function (op, onSubmit) {
    var self = this;
    self.submitHandlers[op] = onSubmit;
    var $button = $('<input name="op" class="dreditor-button" type="button" value="' + op + '" />');
    $button.bind('click.form', function () {
      self.submitHandlers[op].call(self, $button);
    });
    this.append($button);
    // Return the jQuery form object to allow for chaining.
    return this;
  }
};

/**
 * @} End of "defgroup form_api".
 */



/**
 * PIFT enhancements.
 */
Drupal.behaviors.dreditorPIFT = {
  attach: function (context) {
    var $context = $(context);
    $context.find('.field-name-field-issue-files').attr('id', 'recent-files');
    $context.find('.field-name-field-issue-files table').once('dreditor-pift', function () {
      var $table = $(this);
      $table.find('th[name*="size"], th[name*="uid"]').remove();
      $table.find('tbody tr').each(function() {
        var $row = $(this);
        // File row.
        if ($row.is('.extended-file-field-table-row:not(.pift-test-info)')) {
          var $cid = $row.find('.extended-file-field-table-cid');
          var $file = $row.find('.extended-file-field-table-filename .file');
          var $size = $row.find('.extended-file-field-table-filesize');
          var $name = $row.find('.extended-file-field-table-uid');
          var comment = parseInt($cid.text().replace('#', ''), 10) || 0;
          $file.prepend('<span class="size">' + $size.text() + '</span>');
          $size.remove();
          $cid.append($name.html());
          $name.remove();
          var $prevCid = $table.find('tr[data-comment="' + comment +'"] .extended-file-field-table-cid');
          if ($prevCid.length) {
            var rowspan = $cid.attr('rowspan');
            $prevCid.attr('rowspan', ($prevCid.attr('rowspan') + rowspan));
            $cid.remove();
          }
          else {
            $row.attr('data-comment', comment);
          }
        }
        // PIFT row.
        else if ($row.is('.pift-test-info')) {
          var $cell = $row.find('td');
          $row.prev().find('td:not(.extended-file-field-table-cid)').addClass($cell.attr('class'));
          $cell.find('.pift-operations').prependTo($cell).find('a').each(function () {
            if (this.innerText === 'View') {
              this.innerText = Drupal.t('View Results');
            }
            else if (this.innerText === 'Retest') {
              this.innerText = Drupal.t('Re-test');
            }
          });
        }
      });
    });

    $context.find('.field-name-field-issue-changes table.nodechanges-file-changes').each(function() {
      var $new = $(this);
      var $parent = $new.parent();
      $parent.once('dreditor-pift', function () {
        "use strict";
        var tables = {
          'new': $new,
          'hidden': $new.clone(),
          'deleted': $new.clone()
        };
        for (var status in tables) {
          tables[status].find('th:last').remove();
          tables[status].find('tbody tr').each(function() {
            var $row = $(this);
            // File row.
            if ($row.is('.pift-file-info')) {
              if ($row.find('.nodechanges-file-status').text() !== status) {
                $row.remove();
              }
              var $file = $row.find('.nodechanges-file-link .file');
              var $size = $row.find('.nodechanges-file-size');
              $file.prepend('<span class="size">' + $size.text() + '</span>');
              $size.remove();
            }
            // PIFT row.
            else if ($row.is('.pift-test-info')) {
              if (status !== 'new') {
                $row.remove();
              }
              var $cell = $row.find('td');
              $row.prev().find('td').addClass($cell.attr('class'));
              $cell.find('.pift-operations').prependTo($cell).find('a').each(function () {
                if (this.innerText === 'View') {
                  this.innerText = Drupal.t('View Results');
                }
                else if (this.innerText === 'Retest') {
                  this.innerText = Drupal.t('Re-test');
                }
              });
            }
          });
        }
        if (!tables.new.find('tbody tr').length) {
          tables.new.remove();
        }
        var $fieldset,
          hiddenCount = tables.hidden.find('tbody tr').length,
          deletedCount = tables.deleted.find('tbody tr').length;
        if (hiddenCount) {
          tables.hidden.wrap('<fieldset class="collapsible collapsed"><div class="fieldset-wrapper"></div></fieldset>');
          $fieldset = tables.hidden.parent().parent();
          $fieldset.prepend('<legend><span class="fieldset-legend">' + Drupal.formatPlural(hiddenCount, '1 file was hidden', '@count files were hidden') + '</span></legend>');
          $fieldset.appendTo($parent);
        }
        if (deletedCount) {
          tables.deleted.wrap('<fieldset class="collapsible collapsed"><div class="fieldset-wrapper"></div></fieldset>');
          $fieldset = tables.deleted.parent().parent();
          $fieldset.prepend('<legend><span class="fieldset-legend">' + Drupal.formatPlural(deletedCount, '1 file was deleted', '@count files were deleted') + '</span></legend>');
          $fieldset.appendTo($parent);
        }
        Drupal.attachBehaviors($parent);
        $parent.append('<p><a href="#recent-files">Back to recent files</a></p>');
      });
    });
  }
};

/**
 * Attach patch review editor to issue attachments.
 */
Drupal.behaviors.dreditorPatchReview = {
  attach: function (context) {
    // Prevent users from starting to review patches when not logged in.
    if (!$(context).find('#comment-form').length) {
      return;
    }
    $('.field-type-file, .nodechanges-file-changes', context).once('dreditor-patchreview', function () {
      $('a', this).each(function () {
        if (this.href.match(/\.(patch|diff|txt)$/)) {
          // Generate review link.
          var $link = $('<a class="dreditor-button dreditor-patchreview" href="' + this.href + '">Review</a>').click(function () {
            // Load file.
            $.get(this.href, function (content, status) {
              if (status == 'success') {
                // Invoke Dreditor.
                Drupal.dreditor.setup(context, 'patchReview', content);
              }
            });
            return false;
          });
          // Append review link to parent table cell.
          $link.prependTo($(this).parents('tr').find('.file'));

          // Generate simplytest.me links only for patches and diffs.
          if (this.href.substr(-6) === '.patch' || this.href.substr(-5) === '.diff') {
            // Retrieve project shortname.
            var project = Drupal.dreditor.issue.getProjectShortName();
            if (project) {
              var version = Drupal.dreditor.issue.getSelectedVersion().replace('-dev', '');
              if (version) {
                $('<a/>').text('simplytest.me').attr({
                  class: 'dreditor-button dreditor-patchtest',
                  href: 'http://simplytest.me/project/' + project + '/' + version + '?patch[]=' + this.href,
                  target: '_blank'
                }).prependTo(this.parentNode);
              }
            }
          }
        }
      });
    });
  }
}

/**
 * @defgroup dreditor_patchreview Dreditor patch reviewer
 * @{
 */

/**
 * Dreditor patchReview application.
 *
 * This is two-fold:
 * - Drupal.dreditor.patchReview: Handles selections and storage/retrieval of
 *   temporary comment data.
 * - Drupal.dreditor.patchReview.comment: An API to load/save/delete permanent
 *   comments being attached to code lines.
 */
Drupal.dreditor.patchReview = {
  /**
   * patchReview behaviors stack.
   */
  behaviors: {},

  /**
   * Current selection jQuery DOM element stack.
   */
  data: {
    elements: []
  },

  reset: function () {
    // Reset currently stored selection data.
    $(this.data.elements).removeClass('selected');
    this.data = { elements: [] };
    // Remove and delete pastie form.
    if (this.$form) {
      this.$form.remove();
      delete this.$form;
    }
  },

  /**
   * Load data into selection storage.
   */
  load: function (data) {
    // Do not overwrite other comment data; also works for the undefined case.
    if (this.data.id !== data.id) {
      this.reset();
    }
    this.data = data;
  },

  /**
   * Add elements to current selection storage.
   *
   * $.unique() invoked via $.add() fails to apply and identify an existing
   * DOM element id (which is internally done via $.data()). Additionally, ===
   * in $.inArray() fails to identify DOM elements coming from .getSelection(),
   * which are already in our stack. Hence, we need custom code to merge DOM
   * elements of a new selection into our stack.
   *
   * After merging, all elements in the stack are re-ordered by their actual
   * DOM position.
   */
  add: function (elements) {
    if (!elements.length) {
      return elements;
    }
    // Merge new elements.
    var self = this;
    $.each(elements, function () {
      var newelement = this, merge = true;
      // Check whether this element is already in the stack.
      $.each(self.data.elements, function () {
        if (this == newelement) {
          merge = false;
          return;
        }
      });
      if (merge) {
        self.data.elements.push(newelement);
      }
    });
    // Re-order elements by their actual DOM position.
    self.data.elements.sort(sortOrder);
    return elements;
  },

  remove: function (elements) {
    if (!elements.length) {
      return elements;
    }
    var self = this;
    $(elements).removeClass('selected');
    $.each(elements, function () {
      var element = this;
      var newlist = new Array();
      $.each(self.data.elements, function () {
        if (this != element) {
          newlist.push(this);
        }
      });
      self.data.elements = newlist;
    });
  },

  edit: function () {
    var self = this;
    // Mark current selection/commented code as selected.
    $(self.data.elements).addClass('selected');

    // Add Pastie.
    if (!self.$form) {
      self.$form = Drupal.dreditor.form.create('pastie');
      // Add comment textarea.
      self.$form.append('<h3>Comment selected code:</h3>');
      self.$form.append('<textarea name="comment" class="form-textarea resizable" rows="10"></textarea>');
      // Add comment save button.
      self.$form.addButton((self.data.id !== undefined ? 'Update' : 'Save'), function ($button) {
        // @todo For any reason, FF 3.5 breaks when trying to access
        //   form.comment.value. Works in FF 3.0.x. WTF?
        var value = this.find('textarea').val();
        // Store new comment, if non-empty.
        if ($.trim(value).length) {
          self.comment.save({
            id: self.data.id,
            elements: self.data.elements,
            comment: value
          });
        }
        $.each(self.data.elements, function () {
          $(this).attr('title', value);
        });
        // Reset pastie.
        self.reset();
      });
      // Add comment cancel button.
      self.$form.addButton('Cancel', function ($button) {
        // Reset pastie.
        self.reset();
      });
      // Add comment delete button for existing comments.
      if (self.data.id !== undefined) {
        self.$form.addButton('Delete', function ($button) {
          self.comment.remove(self.data.id);
          // Reset pastie.
          self.reset();
        });
      }
      // Append pastie to sidebar, insert current comment and focus it.
      self.$form.appendTo('#bar').find('textarea').val(self.data.comment || '');
      Drupal.dreditor.attachBehaviors();
      // Focus pastie; only for initial comment selection to still allow for
      // copying of file contents.
      self.$form.find('textarea').focus();
    }
  },

  /**
   * Wrapper around jQuery's sortOrder() to sort review comments.
   */
  sort: function (a, b) {
    if (!a || !b) {
      return 0;
    }
    return sortOrder(a.elements[0], b.elements[0]);
  },

  paste: function () {
    var html = '';
    var comments = [];
    this.comment.comments.sort(this.sort);
    $.each(this.comment.comments, function (index, comment) {
      // Skip deleted (undefined) comments; this would return window here.
      if (!comment) {
        return true;
      }
      var $elements = $(this.elements);
      var markup = '<code>\n';
      // Add file information.
      var lastfile = $elements.eq(0).prevAll('tr.file:has(a.file)').get(0);
      if (lastfile) {
        markup += lastfile.textContent + '\n';
      }
      // Add hunk information.
      var lasthunk = $elements.eq(0).prevAll('tr.file').get(0);
      if (lasthunk) {
        markup += lasthunk.textContent + '\n';
      }

      var lastline = $elements.get(0).previousSibling;
      var lastfileNewlineAdded;

      $elements.each(function () {
        var $element = $(this);
        lastfileNewlineAdded = false;
        // Add new last file, in case a comment spans over multiple files.
        if (lastfile && lastfile !== $element.prevAll('tr.file:has(a.file)').get(0)) {
          lastfile = $element.prevAll('tr.file:has(a.file)').get(0);
          if (lastfile) {
            markup += '\n' + lastfile.textContent + '\n';
            lastfileNewlineAdded = true;
          }
        }
        // Add new last hunk, in case a comment spans over multiple hunks.
        if (lasthunk && lasthunk != $element.prevAll('tr.file').get(0)) {
          lasthunk = $element.prevAll('tr.file').get(0);
          if (lasthunk) {
            // Only add a newline if there was no new file already.
            if (!lastfileNewlineAdded) {
              markup += '\n';
              lastfileNewlineAdded = true;
            }
            markup += lasthunk.textContent + '\n';
          }
        }
        // Add a delimiter, in case a comment spans over multiple selections.
        else if (lastline && lastline != $element.get(0).previousSibling) {
          markup += '...\n';
        }
        markup += $element.find('.pre').text() + '\n';

        // Use this line as previous line for next line.
        lastline = $element.get(0);
      });

      markup += '</code>\n';
      markup += '\n' + this.comment;
      comments.push(markup);
    });
    if (comments.length === 1) {
      html += comments.join('');
    }
    // If there's more than one comment, wrap them in ordered list markup.
    else if (comments.length > 1) {
      html += '<ol>\n\n';
      for (var i = 0; i < comments.length; i++) {
        html += '<li>\n' + comments[i] + '\n</li>\n\n';
      }
      html += '</ol>';
    }

    // Let's get some attention! :)
    function shuffle(array) {
      for(var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);
      return array;
    }
    var messages = [
      //'Powered by <a href="@dreditor-url">Dreditor</a>.'
    ];
    // Add Drupal core specific messages.
    var daysToCodeFreeze = 0, daysToPointRelease = 0, criticalIssueCount = 0;
    if ($('#edit-project-info-project-title').val() == 'Drupal core') {
      // Code freeze specific messages.
      daysToCodeFreeze = parseInt((new Date(2010, 1 - 1, 15) - new Date()) / 1000 / 60 / 60 / 24, 10);
      if (daysToCodeFreeze > 0) {
        $.merge(messages, [
          '@days days to code freeze.  <a href="@dreditor-url">Better review yourself.</a>'
        ]);
      }
      // Point release freeze (last Wed of month) specific messages.
      // @thanks http://stackoverflow.com/questions/2914095/detect-last-week-of-each-month-with-javascript
      // Temporarily disabled due to bogus negative intervals.
      // @see http://drupal.org/node/1391946
      /*
      var lastWed = new Date();
      var dayOfWeek = 3; // 0 is Sunday.
      lastWed.setMonth(lastWed.getMonth() + 1);
      lastWed.setDate(0);
      lastWed.setDate(lastWed.getDate() - (lastWed.getDay() != 0 ? lastWed.getDay() - dayOfWeek : 7 - dayOfWeek));
      daysToPointRelease = lastWed.getDate() - new Date().getDate();
      messages.push('@point-release-days days to next Drupal core point release.');
      */

      // Critical issue queue specific messages.
      // @todo Precondition?
      criticalIssueCount = $('#block-bingo-0 a:contains("Critical issues")').text();
      if (criticalIssueCount.length) {
        criticalIssueCount = criticalIssueCount.match(/\s*(\d+)/)[1];
        $.merge(messages, [
          '@critical-count critical left.  <a href="@dreditor-url">Go review some!</a>'
        ]);
      }
    }
    if (messages.length) {
      var message = shuffle(messages)[0];
      message = message.replace('@dreditor-url', 'http://drupal.org/project/dreditor');
      message = message.replace('@days', daysToCodeFreeze);
      message = message.replace('@point-release-days', daysToPointRelease);
      message = message.replace('@critical-count', criticalIssueCount);
      html += '\n\n<em>' + message + '</em>\n';
    }

    // Paste comment into issue comment textarea.
    var $commentField = $('#comment-form textarea[name^="comment_body"]');
    $commentField.val($commentField.val() + html);
    // Flush posted comments.
    this.comment.comments = [];
    // Change the status to 'needs work'.
    // @todo Prevent unintended/inappropriate status changes.
    //$('#edit-sid').val(13);
    // Jump to the issue comment textarea after pasting.
    Drupal.dreditor.goto('#comment-form');
    // Close Dreditor.
    Drupal.dreditor.tearDown();
  }
};

Drupal.dreditor.patchReview.comment = {
  /**
   * Review comments storage.
   */
  comments: [],

  /**
   * Create or update a comment.
   *
   * If data already contains an id, the existing comment is updated.
   *
   * @return
   *   The stored data, including new id for new comments.
   */
  save: function (data) {
    if (data.id !== undefined) {
      this.comments[data.id] = data;
    }
    else {
      this.comments.push(data);
      // Return value of .push() is not suitable for real ids.
      var newid = this.comments.length - 1;
      this.comments[newid].id = data.id = newid;
    }
    // Mark new comments, if there are any.
    $(this.comments[data.id].elements).addClass('new-comment');
    $(this.comments[data.id].elements).addClass('comment-id-' + data.id).addClass('has-comment');

    Drupal.dreditor.attachBehaviors();
    return data;
  },

  load: function (id) {
    if (typeof id !== undefined && typeof this.comments[id] == 'object') {
      var data = this.comments[id];
    }
    return data || {};
  },

  /**
   * Deletes a comment by ID.
   *
   * Called 'remove', since 'delete' is a reserved keyword.
   */
  remove: function (id) {
    var data = this.load(id);
    if (data && data.id !== undefined) {
      $(data.elements)
        .removeClass('has-comment')
        .removeClass('comment-id-' + id)
        .removeAttr('title')
        // @todo For whatever reason, the click event is not unbound here.
        .unbind('click.patchReview.editComment');
      delete this.comments[id];
    }
    return data || {};
  }
};

Drupal.dreditor.patchReview.overlay = {
  element: null,
  data: {},

  setup: function () {
    this.element = $('<div id="dreditor-overlay"></div>').hide().appendTo('#dreditor #bar');
    return this;
  },

  load: function (data) {
    // Setup overlay if required.
    if (!this.element) {
      this.setup();
    }
    if (data !== undefined && typeof data.comment == 'string') {
      this.data = data;
      this.element.empty();
      // Do some basic text2html processing.
      var content = data.comment.replace(/\n$[^<]/gm, '<br />\n');
      // @todo jQuery seems to suck up newlines in child nodes (such as <code>).
      this.element.append('<p>' + content + '</p>');
    }
  },

  show: function () {
    this.element.show();
    return this;
  },

  hide: function () {
    this.element.hide();
    return this;
  }
};

/**
 * Create diff outline and highlighting from plaintext code.
 *
 * We parse all lines of the file into separate DOM elements to be able to
 * attach data (e.g. comments) to selected lines and generate a "jump menu"
 * for files and hunks.
 *
 * @param context
 *   The context to work on.
 * @param code
 *   Plain-text code to parse.
 *
 * @todo Move setup and storage of pastie elsewhere?
 */
Drupal.dreditor.patchReview.behaviors.setup = function (context, code) {
  // Ensure this is only executed once.
  if ($('#code', context).length || !code) {
    return;
  }

  // Reset pastie; may have been active when user clicked global 'Cancel' button.
  // @todo This cries for a proper hook system.
  Drupal.dreditor.patchReview.reset();

  // Convert CRLF, CR into LF.
  code = code.replace(/\r\n|\r/g, "\n");
  // Escape HTML tags and entities; order of replacements is important.
  code = code.replace(/&/g, '&amp;');
  code = code.replace(/</g, '&lt;');
  code = code.replace(/>/g, '&gt;');
  // Remove cruft: IDE comments and unversioned files.
  code = code.replace(/^\# .+\n|^\? .+\n/mg, '');

  // Setup code container.
  var $code = $('<table id="code" unselectable="on"></table>');
  var $menu = $('#menu', context);
  var $lastFile = $('<li>Parse error</li>');

  $('<h3>Diff statistics</h3>').appendTo('#dreditor #bar');
  var $diffstat = $('<div id="diffstat"></div>').appendTo('#dreditor #bar');
  var diffstat = { files: 0, insertions: 0, deletions: 0 };

  // The line ruler must be displayed consistently across all browsers and OS
  // that may or may not have the same fonts (kerning). Calculate the width of
  // 81 "0" characters (80 character line plus the +/- prefix from the diff)
  // by using an array (82 items joined by "0").
  var $lineRuler = $('<table id="code"><tbody><tr><td class="ln"></td><td class="ln"></td><td><span class="pre">' + Array(82).join('0') + '</span></td></tr></tbody></table>')
    .appendTo('#dreditor');
  var lineRulerOffset = $lineRuler.find('span').width();
  var lineRulerStyle = '';
  // Check for a reasonable value for the ruler offset.
  if (lineRulerOffset > 100) {
    lineRulerStyle = 'visibility: visible; left: ' + lineRulerOffset + 'px;';
  }
  $lineRuler.remove();

  code = code.split('\n');
  var ln1 = '';
  var ln2 = '';
  for (var n in code) {
    var ln1o = true;
    var ln2o = true;
    var prettify_line = true;
    var line = code[n];

    // Build file menu links.
    line = line.replace(/^(\+\+\+ )([^\s]+)(\s.*)?/, function (full, match1, match2, match3) {
      var id = match2.replace(/[^A-Za-z_-]/g, '');
      $lastFile = $('<li><a href="#' + id + '">' + match2 + '</a></li>');
      $menu.append($lastFile);
      diffstat.files++;
      return match1 + '<a class="file" id="' + id + '">' + match2 + '</a>' + (match3 ? match3 : '');
    });
    // Build hunk menu links for file.
    line = line.replace(/^(@@ .+ @@\s+)([^\s]+\s[^\s\(]*)/, function (full, match1, match2) {
      var id = match2.replace(/[^A-Za-z_-]/g, '');
      $lastFile.append('<li><a href="#' + id + '">' + match2 + '</a></li>');
      return match1 + '<a class="hunk" id="' + id + '">' + match2 + '</a>';
    });

    // parse hunk line numbers
    var line_numbers = line.match(/^@@ -([0-9]+),[0-9]+ \+([0-9]+),[0-9]+ @@/);
    if (line_numbers) {
      ln1 = line_numbers[1];
      ln2 = line_numbers[2];
    }

    var classes = [], syntax = false;
    // Colorize file diff lines.
    if (line.match(/^((index|===|RCS|new file mode|deleted file mode|retrieving|diff|\-\-\-\s|\-\-\s|\+\+\+\s|@@\s).*)$/i)) {
      classes.push('file');
      ln1o = false;
      ln2o = false;
      prettify_line = false;
    }
    // Colorize old code, but skip file diff lines.
    else if (line.match(/^((?!\-\-\-|\-\-)\-.*)$/)) {
      classes.push('old');
      diffstat.deletions++;
      if (ln1) {
        ln2o = false;
        ln1++;
      }
    }
    // Colorize new code, but skip file diff lines.
    else if (line.match(/^((?!\+\+\+)\+.*)$/)) {
      // Expose tabs.
      line = line.replace(/(\t+)/, '<span class="error tab">$1</span>');
      // Wrap trailing white-space with a SPAN to expose them during patch
      // review. Also add a hidden end-of-line character that will only appear
      // in the pasted code.
      line = line.replace(/^(.*\S)(\s+)$/, '$1<span class="error whitespace">$2</span><span class="hidden">¶</span>');

      classes.push('new');
      diffstat.insertions++;
      syntax = true;
      if (ln2) {
        ln1o = false;
        ln2++;
      }
    }
    // Replace line with a space (so ruler shows up).
    else if (!line.length) {
      line = '&nbsp;';
    }
    // Match git format-patch EOF lines and reset line count.
    else if (line.match(/^\-\-$/)) {
      ln1o = false;
      ln2o = false;
      ln1 = '';
      ln2 = '';
    }
    // Detect missing newline at end of file.
    else if (line.match(/.*No newline at end of file.*/i)) {
      line = '<span class="error eof">' + line + '</span>';
    }
    else {
      // @todo Also colorizing unchanged lines makes added comments almost
      // invisible. Although we could use .new.comment as CSS selector, the
      // question of a sane color scheme remains.
      // syntax = true;
      if (ln1 && ln1o) {
        ln1++;
      }
      if (ln2 && ln2o) {
        ln2++;
      }
    }
    // Colorize comments.
    if (syntax && line.match(/^.\s*\/\/|^.\s*\/\*[\* ]|^.\s+\*/)) {
      classes.push('comment');
    }

    // Wrap all lines in PREs for copy/pasting and add the 80 character ruler.
    classes = (classes.length ? ' class="' + classes.join(' ') + '"' : '');
    line = '<tr' + classes + '><td class="ln" data-line-number="' + (ln1o ? ln1 : '') + '"></td><td class="ln" data-line-number="' + (ln2o ? ln2 : '') + '"></td><td><span class="pre"><div class="line-ruler" style="' + lineRulerStyle + '"></div>' + line + '</span></td></tr>';

    // Append line to parsed code.
    $code.append(line);
  }
  // Append to body...
  $('#dreditor-content', context)
    // the parsed code.
    .append($code);

  // Append diffstat to sidebar.
  $diffstat.html(diffstat.files + '&nbsp;files changed, ' + diffstat.insertions + '&nbsp;insertions, ' + diffstat.deletions + '&nbsp;deletions.');

  var start_row;
  $('tr', $code).mousedown(function(){
    start_row = $(this)[0];
  });

  // Colorize rows during selection.
  $('tr', $code).mouseover(function(){
    if (start_row) {
      end_row = $(this)[0];
      var start = false;
      var end = false;
      var selection = new Array();
      selection.push(start_row);
      $('tr', $code).each(function(){
        if ($(this)[0] == start_row) {
          start = true;
        }
        if (start && !end) {
          selection.push($(this)[0]);
        }
        if ($(this)[0] == end_row) {
          end = true;
        }
      });
      // Refresh selection.
      $('.pre-selected').removeClass('pre-selected');
      $.each(selection, function () {
        $(this).addClass('pre-selected');
      });
    }
  });

  // Finalize selection.
  $('tr', $code).mouseup(function(){
    if (start_row) {
      end_row = $(this)[0];
      var start = false;
      var end = false;
      var selection = new Array();
      selection.push(start_row);
      $('tr', $code).each(function(){
        if ($(this)[0] == start_row) {
          start = true;
        }
        if (start && !end) {
          selection.push($(this)[0]);
        }
        if ($(this)[0] == end_row) {
          end = true;
        }
      });

      // If at least one element in selection is not yet selected, we need to select all. Otherwise, deselect all.
      var deselect = true;
      $.each(selection, function () {
        if (!$(this).is('.selected')) {
          deselect = false;
        }
      });
      $('.pre-selected').removeClass('pre-selected');
      if (deselect) {
        Drupal.dreditor.patchReview.remove(selection);
      }
      else {
        Drupal.dreditor.patchReview.add(selection);
        // Display pastie.
        Drupal.dreditor.patchReview.edit();
      }
    }
    start_row = false;
  });
};

/**
 * Attach click handler to jump menu.
 */
Drupal.dreditor.patchReview.behaviors.jumpMenu = function (context) {
  $('#menu a', context).once('dreditor-jumpmenu', function () {
    $(this).click(function () {
      Drupal.dreditor.goto(this.hash);
      return false;
    });
  });
};

Drupal.dreditor.patchReview.behaviors.attachPastie = function (context) {
  // @todo Seems we need detaching behaviors, but only for certain DOM elements,
  //   wrapped in a jQuery object to eliminate the naive 'new-comment' handling.
  $('#code .has-comment.new-comment', context).removeClass('new-comment')
    .unbind('click.patchReview.editComment').bind('click.patchReview.editComment', function () {
      // Load data from from element attributes.
      var params = Drupal.dreditor.getParams(this, 'comment');
      if (params.id !== undefined) {
        // Load comment and put data into selection storage.
        var data = Drupal.dreditor.patchReview.comment.load(params.id);
        Drupal.dreditor.patchReview.load(data);
        // Display pastie.
        Drupal.dreditor.patchReview.edit();
      }
      return false;
    })
    // Display existing comment on hover.
    .hover(
      function () {
        // Load data from from element attributes.
        var params = Drupal.dreditor.getParams(this, 'comment');
        // Load comment and put data into selection storage.
        if (params.id !== undefined) {
          var data = Drupal.dreditor.patchReview.comment.load(params.id);
          Drupal.dreditor.patchReview.overlay.load(data);
          // Display overlay.
          Drupal.dreditor.patchReview.overlay.show();
        }
      },
      function () {
        Drupal.dreditor.patchReview.overlay.hide();
      }
    );
};

Drupal.dreditor.patchReview.behaviors.saveButton = function (context) {
  if (!$('#dreditor-actions #dreditor-save', context).length) {
    // @todo Convert global Dreditor buttons into a Dreditor form.
    var $save = $('<input id="dreditor-save" class="dreditor-button" type="button" value="Paste" />');
    $save.click(function () {
      Drupal.dreditor.patchReview.paste();
      return false;
    });
    $save.prependTo('#dreditor-actions');
  }
};

/**
 * Add link to toggle display of deleted patch lines.
 */
Drupal.dreditor.patchReview.behaviors.toggleDeletions = function (context) {
  $('#dreditor #bar').once('toggle-deletions', function () {
    var $link = $('<a href="#" class="dreditor-application-toggle">Hide deletions</a>');
    $link.toggle(
      function () {
        $('#code tr.old', context).addClass('element-invisible');
        $link.text('Show deletions');
        this.blur();
        return false;
      },
      function () {
        $('#code tr.old', context).removeClass('element-invisible');
        $link.text('Hide deletions');
        this.blur();
        return false;
      }
    );
    $(this).append($link);
  });
};

/**
 * @} End of "defgroup dreditor_patchreview".
 */

/**
 * Issue summary AJAX editor.
 */
Drupal.behaviors.dreditorIssueSummary = {
  attach: function (context) {
    // Limit to project_issue node view page.
    $('#project-summary-container').once('dreditor-issue-summary', function () {
      // Clone "Edit" link after "Issue summary" title.
      var $edit_wrapper = $('<small class="admin-link"> [ <span></span> ] </small>');
      var $edit_link = $('#tabs a:contains("Edit")').clone();
      $edit_wrapper.find('span').append($edit_link);
      $edit_wrapper.appendTo($(this).parent().find('h2:first'));

      var $widget = $('<div id="dreditor-widget"></div>').insertAfter(this).hide();

      $edit_link.click(function () {
        // First of all, remove this link.
        $edit_wrapper.remove();
        // Retrieve the node edit form.
        $.get(this.href, function (data) {
          var $data = $(data);
          // Do power users really need this advise? Investigate this.
          // $widget.append($data.find('div.help'));
          $widget.append($data.find('#node-form'));

          // For users with just one input format, wrap filter tips in a fieldset.
          // @todo Abstract this into a behavior. Also applies to comment form.
          $widget.find('fieldset > ul.tips')
            .wrap('<fieldset class="collapsible collapsed"></fieldset>')
            .before('<legend>Input format</legend>');
          // Clean up.
          // Remove messages; contains needless info.
          $widget.find('div.messages.status').remove();
          // That info about issue fields in .standard .standard thingy, too.
          $widget.find('div.node-form > div.standard > div.standard').remove();
          // Hide node admin fieldsets; removing these would result in nodes being
          // unpublished and author being changed to Anonymous on submit.
          $widget.find('div.admin').hide();

          // Flatten issue summary, input format, and revision info fielsets.
          // Blatantly remove all other fieldsets. :)
          $widget.find('fieldset')
            .not(':has(#edit-body, .tips, #edit-log)')
            .removeClass('collapsible').hide();
          // Visually remove top-level fieldsets, except text format.
          $widget.find('fieldset:has(#edit-body, #edit-log)')
            .removeClass('collapsible').addClass('fieldset-flat');
          // Remove needless spacing between summary and revision elements.
          $widget.find('.fieldset-flat:eq(0)').css('marginBottom', 0);

          // Hide revision checkbox (only visible for admins, can't be disabled)
          // and revision log message description.
          $widget.find('#edit-revision-wrapper, #edit-log-wrapper .description').hide();
          // Convert revision log message textarea into textfield and prepopulate it.
          var $textarea = $widget.find('#edit-log');
          var $textfield = $('<input type="text" size="60" style="width: 95%;" />');
          $.each($textarea[0].attributes, function (index, attr) {
            $textfield.attr(attr.name, attr.value);
          });
          // Enforced log message doesn't really make sense for power users.
          // We're not crafting an encyclopedia with issues.
          $textfield.val('Updated issue summary.');
          $textarea.replaceWith($textfield);

          // Remove "Preview changes" and "Delete" buttons.
          $widget.find('#edit-preview-changes').remove();
          $widget.find('#edit-delete').remove();
          // Sorry, no support for "Preview" yet.
          $widget.find('#edit-preview').remove();

          // Add a Cancel button. Move it far away from the submit button. ;)
          $widget.find('#edit-submit').before(
            $('<a href="javascript:void(0);" class="dreditor-button right">Cancel</a>').click(function () {
              $widget.slideUp('fast', function () {
                $widget.remove();
              });
              return false;
            })
          );

          // Lastly, attach behaviors and slide in.
          Drupal.attachBehaviors($widget.get(0));
          $widget.slideDown();
        }, 'html');
        return false;
      });
    });
  }
};

/**
 * Adds a button to insert the issue summary template.
 */
Drupal.behaviors.dreditorIssueSummaryTemplate = {
  attach: function (context) {
    // Add the template button above the issue summary field.
    $('body.logged-in.page-node form.node-project_issue-form textarea[name="body[und][0][value]"]').once('dreditorIssueTemplate', function () {
      var $body = $(this);

      // Append this button to the label area.
      var $label = $('label[for*="edit-body-und-0-value"]');

      // Create a button to insert the template.
      $('<a/>')
        .attr({
          class: 'dreditor-button',
          href:  '#',
          style: 'margin-left: 10px;'
        })
        .text('Insert template')
        .appendTo($label)
        .click(function (e) {
          // Load the issue summary instructions.
          $.get('/node/1326662', function (data) {
            // Retrieve the template.
            var $template = $('<div/>').html($(data).find('#node-1326662 code').text());
            // On node add, remove the "Original report by" section.
            if (location.href.search('node/add') !== -1) {
              $template.find('#summary-original-report').remove();
            }
            // On quick edit, we can go ahead and replace the @username with the
            // existing link to the original author.
            else if (!location.href.match(/^.*node\/[^\/]*\/edit/)) {
              var $profileLink = $('div.node > div.submitted a').clone();
              if ($profileLink.length) {
                $profileLink.text('@' + $profileLink.text());
              }
              else {
                $profileLink = $('<a/>').text('Anonymous').attr('href', '#');
              }
              $template.find('#summary-original-report a').replaceWith($('<div/>').html($profileLink).html());
            }
            // On actual node edit pages, we need to do an AJAX callback to get
            // the JSON data for the issue and replace @username with the original
            // author asynchronously.
            else {
              var nodePath = location.href.match(/^.*node\/[0-9]*/);
              if (nodePath) {
                $.getJSON(nodePath[0] + '/project-issue/json', function (json){
                  // @todo fix this once JSON data can be extracted again.
                  return;
                  var $profileLink, $bodyVal = $('<div/>').html($body.val());
                  if (!json.authorId || !json.authorName || !json.authorUrl) {
                    $profileLink = $('<a/>').text('Anonymous').attr('href', '#');
                  }
                  else {
                    $profileLink = $('<a/>').text('@' + json.authorName).attr('href', json.authorUrl);
                  }
                  $bodyVal.find('#summary-original-report a').replaceWith($('<div/>').html($profileLink).html());
                  $body.val($bodyVal.html());
                });
              }
            }
            // Prepend text to current body.
            $body.val($template.html().replace(/<\/em>/g, "</em>\n\n").replace(/<\/h3>/g, "</h3>\n\n") + $body.val());
          });
          // Prevent default "click" event.
          e.preventDefault();
        });

      // Add a link to view the issue summary instructions.
      $('<a href="/issue-summaries" target="_blank">Issue summary instructions</a>')
        .appendTo($label)
        .before('(')
        .after(')');

    });
  }
};

/**
 * Streamline issue comment form.
 *
 * Altering of the form makes certain browsers (such as Firefox) no longer find
 * the form fields upon page refresh (i.e. effective result like
 * autocomplete="off"), so we need to work with CSS tricks.
 *
 * Moving form elements around, unwrapping them, and similar actions are not
 * supported.
 */
Drupal.behaviors.dreditorIssueCommentForm = {
  attach: function (context) {
    $('#comment-form:has(#edit-category)', context).once('dreditor-issue-comment-form', function () {
      // On comment/reply path pages, drupal.org does not apply the required
      // .node-type-project-issue to BODY, which the Bluecheese theme targets for
      // styling comments. Ensure that it is set.
      // @todo Fix upstream.
      $('body').addClass('node-type-project-issue');

      var $form = $('> div', this);
      // Remove that ugly looking heading.
      $form.parents('.content').prev('h2').remove();

      // Since we cannot move DOM elements around, we need to use advanced CSS
      // positioning to achieve a sane order of form elements.
      $form.css({ position: 'relative', paddingTop: '20em' });

      // Unwrap basic issue data.
      $form
        .find('fieldset:first')
        .css({ position: 'absolute', top: '2em', width: '100%' })
        .attr('id', 'dreditor-issue-data')
        .removeClass('collapsible').addClass('fieldset-flat')
        .find('.fieldset-wrapper')
        // Hide note about issue title for n00bs.
        .find('.description:first').hide().end();

      // Hide label for comment textarea.
      $form.find('label[for="edit-comment"]').hide();

      // Move issue tags into issue data.
      // Note: Issue tags are still reset upon page refresh, but that's caused by
      // by collapse.js in D6, which inserts div.fieldset-wrapper into the form.
      // Issue tags are a constant drama on d.o, got moved into a fieldset and
      // back out at least twice already. Ignore epic discussions and simply find
      // both.
      var $tags = $form.find('fieldset:has(.form-item[id*=tags])')
        .removeClass('collapsible collapsed').addClass('fieldset-flat');
      if (!$tags.length) {
        $tags = $form.find('.form-item[id*=tags]');
      }
      $tags
        .css({ position: 'absolute', top: '15.5em', width: '100%', margin: 0 })
        .find('label').each(function () {
          var $label = $(this).hide();
          $('#' + $label.attr('for'), context).attr('title', $label.text());
        });

      // Unwrap attachments.
      $form
        .find('.attachments fieldset')
        .removeClass('collapsible').addClass('fieldset-flat')
        .find('.description:first').hide();

      // Add expected comment #number; parse last comment, since deleted/
      // unpublished comments are counted. Also, there
      // are no comments to count on fresh issues.
      var count = $('#comments .comment:last .comment-title', context).text() || 0;
      if (count) {
        count = parseInt(count.match(/\d+$/)[0], 10);
      }
      count++;
      $('<h3 class="comment-title">#' + count + '</h3>')
        .css({ position: 'absolute', top: 11 })
        .prependTo($form);

      // Add classes to make it look licky. Needs to stay last to not break
      // comment count.
      $(this).addClass('comment');
      $form.addClass('comment-inner');
    });
  }
};

/**
 * Allow to make comment widget sticky.
 *
 * On an issue with many follow-ups, one needs to jump back and forth between
 * the comment form and individual earlier comments you want to reply to.
 *
 * To prevent that, allow to make the comment form sticky (like the ajaxified
 * issue summary widget), so the user is able to read, scroll, and comment at
 * the same time.
 */
Drupal.behaviors.dreditorIssueCommentFormSticky = {
  attach: function (context) {
    $(context).find('.comment-form').once('dreditor-issue-comment-form-sticky', function () {
      var $wrapper = $(this).find('.resizable-textarea');
      var $toggle = $('<a href="javascript:void(0);" class="dreditor-application-toggle">Make sticky</a>');
      $toggle.click(function () {
        if ($wrapper.attr('id')) {
          $wrapper.removeAttr('id');
          $toggle.removeClass('active').text('Make sticky');
        }
        else {
          $wrapper.attr('id', 'dreditor-widget');
          $toggle.addClass('active').text('Unstick');
        }
      });
      $wrapper.prepend($toggle);
    });
  }
};

/**
 * Backs up form values before submit for potential later restore.
 *
 * drupal.org's advanced infrastructure may respond with totally bogus things
 * like HTTP redirects to completely invalid locations. Native support for
 * retaining previously posted form values in modern browsers is entirely
 * hi-jacked in those cases; the browser doesn't even know anymore that it
 * posted something.
 */
Drupal.behaviors.dreditorFormBackup = {
  attach: function (context) {
    $(context).find('#comment-form:has(#edit-category)').once('dreditor-form-backup', function () {
      var $form = $(this);

      var $restore = $('<a href="javascript:void()" class="dreditor-application-toggle">Restore previously entered data</a>').click(function () {
        if (window.confirm('Reset this form to your last submitted values?')) {
          var values = Drupal.storage.unserialize(Drupal.storage.load('form.backup'));
          $form.find('[name]').not('[type=hidden]').each(function () {
            if (typeof values[this.name] != 'undefined') {
              $(this).val(values[this.name]);
            }
          });
          // Remove this (restore) button.
          $(this).fadeOut();
        }
        return false;
      });

      $form.find('[type="submit"]')
        .bind('click', function () {
          Drupal.storage.save('form.backup', $form.serialize());
        })
        // @todo Replace with .eq(-1), available in jQuery 1.4+.
        .filter(':last').after($restore);
    });
  }
};


/**
 * Suggest a filename for patches to upload in an issue.
 *
 * Developed in issue: http://drupal.org/node/1294662
 */
Drupal.behaviors.dreditorPatchNameSuggestion = {
  attach: function (context) {
    // Attach this behavior only to project_issue nodes. Use a fast selector for
    // the common case, but also support comment/reply/% pages.
    if (!($('body.node-type-project-issue', context).length || $('div.project-issue', context).length)) {
      return;
    }

    $('#comment-form #edit-upload-wrapper, #node-form #edit-upload-wrapper', context).once('dreditor-patchsuggestion', function () {
      var $container = $('#edit-upload-wrapper > label');
      var $link = $('<a class="dreditor-application-toggle dreditor-patchsuggestion" href="#">Patchname suggestion</a>');
      $link.prependTo($container);
      $link.click(function() {
        var title = Drupal.dreditor.issue.getIssueTitle() || 'title';
        title = title.replace(/[^a-zA-Z0-9]+/g, '_');
        // Truncate and remove a heading/trailing undescore.
        title = title.substr(0, 60);
        title = title.replace(/(^_|_$)/, '');

        var nid = Drupal.dreditor.issue.getNid() || 0;
        var project = Drupal.dreditor.issue.getProjectShortName() || 'unknownProject';
        var component = Drupal.dreditor.issue.getSelectedComponent() || 'component';
        component = component.replace(/[^a-zA-Z0-9]+/, '-').toLowerCase();

        var core = Drupal.dreditor.issue.getSelectedVersionCore() || '';
        core = core.substring(0, 1);

        // Build filename suggestion.
        var patchName = '';
        if (project == 'drupal') {
          patchName = project + core + '-' + component;
        }
        else {
          patchName = project + '-' + component;
        }

        if (nid != 0) {
          var newCommentNumber = Drupal.dreditor.issue.getNewCommentNumber();

          patchName += '-' + nid + '-' + newCommentNumber;
        }

        patchName += '.patch';

        window.prompt("Please use this value", patchName);
        return false;
      });
    });
  }
};

Drupal.dreditor.issue = {}

/**
 * Gets the issue node id.
 */
Drupal.dreditor.issue.getNid = function() {
  var href = $('#tabs a:first').attr('href');
  if (href.length) {
    return href.match(/(?:node|comment\/reply)\/(\d+)/)[1];
  }
  return false;
};

/**
 * Gets the next comment nummer for the current issue.
 */
Drupal.dreditor.issue.getNewCommentNumber = function() {
  // Get comment count.
  return parseInt($('#comment-form .comment-inner > h3').text().match(/\d+$/)[0], 10);
};

/**
 * Gets the issue title.
 */
Drupal.dreditor.issue.getIssueTitle = function() {
  var title = $('#page-subtitle').text() || '';
  return title;
};

/**
 * Gets the project shortname.
 *
 * @return
 *   Return false when using the preview mode since the breadcrumb is not
 *   included in the preview mode.
 */
Drupal.dreditor.issue.getProjectShortName = function() {

  // Retreive project from breadcrumb.
  var project = $('.breadcrumb a:eq(0)').attr('href');

  // @todo The comment preview page does not contain a breadcrumb and also
  //   does not expose the project name anywhere else.
  if (project) {
    // The Drupal (core) project breadcrumb does not contain a project page link.
    if (project == '/project/issues/drupal') {
      project = 'drupal';
    }
    else {
      project = project.substr(9);
    }
  }
  else {
    project = false;
  }

  return project;
};

Drupal.dreditor.issue.getSelectedComponent = function() {
  // Retrieve component from the comment form selected option label.
  var version = $('#edit-project-info-component option:selected').text();
  return version;
};

/**
 * Gets the selected version.
 *
 * Variations:
 *   7.x
 *   7.x-dev
 *   7.x-alpha1
 *   7.20
 *   7.x-1.x
 *   7.x-1.12
 *   7.x-1.x
 *   - 8.x issues -
 *   - Any -
 *   All-versions-4.x-dev
 */
Drupal.dreditor.issue.getSelectedVersion = function() {
  // Retrieve version from the comment form selected option label.
  var version = $('.field-name-field-issue-version .field-item').text();
  return version;
};

/**
 * Gets the selected core version.
 *
 * Variations:
 *   7.x
 *   7.20
 */
Drupal.dreditor.issue.getSelectedVersionCore = function() {
  var version = Drupal.dreditor.issue.getSelectedVersion();
  var matches = version.match(/^(\d+\.[x\d]+)/);
  if (matches) {
    return matches[0];
  }
  else {
    return false;
  }
};

/**
 * Gets the selected contrib version.
 *
 * Variations:
 *   1.x
 *   1.2
 */
Drupal.dreditor.issue.getSelectedVersionContrib = function() {
  var version = Drupal.dreditor.issue.getSelectedVersion();
  var matches = version.match(/^\d+\.x-(\d+\.[x\d]+)/);
  if (matches) {
    return matches[1];
  }
  else {
    return false;
  }
};

/**
 * Gets the selected core + contrib version.
 *
 * Variations:
 *   7.x-1.x
 *   7.x-1.2
 */
Drupal.dreditor.issue.getSelectedVersionCoreContrib = function() {
  version = Drupal.dreditor.issue.getSelectedVersion();
  var matches = version.match(/^(\d+\.x-\d+\.[x\d]+)/);
  if (matches) {
    return matches[0];
  }
  else {
    return false;
  }
};

/**
 * Attach commit message generator to issue comment form.
 */
Drupal.behaviors.dreditorCommitMessage = {
  attach: function (context) {
    // Attach this behavior only to project_issue nodes. Use a fast selector for
    // the common case, but also support comment/reply/% pages.
    if (!($('body.node-type-project-issue', context).length || $('div.project-issue', context).length)) {
      return;
    }
    var self = this;
    $('#comment-form .form-textarea-wrapper', context).once('dreditor-commitmessage', function () {
      // Prepend commit message button to comment form.
      // @todo Generalize this setup. Somehow.
      var $container = $('<div class="dreditor-actions"></div>');
      $(this).before($container);
      // Generate commit message button.
      var $link = $('<a class="dreditor-application-toggle dreditor-commitmessage" href="#">Create commit message</a>');
      $link.click(function () {
        // A port of PHP's array_count_values(), combined with a keysort.
        $.fn.extend({
          countvalues: function () {
            var elems = this.get();
            // Count array values.
            var counts = {}, i = elems.length, j;
            while (i--) {
              var value = elems[i].textContent;
              j = counts[value];
              counts[value] = (j ? j + 1 : 1);
            }
            // Sort value counts by counts.
            var temp = [];
            for (var key in counts) {
              temp.push([ counts[key], key ]);
            }
            temp.sort(function (a, b) {
              return a[0] > b[0];
            });
            // Return the list of values, ordered by counts (descending).
            var result = [], i = temp.length;
            while (i--) {
              result.push(temp[i][1]);
            }
            return result;
          }
        });

        // Build list of top patch submitters.
        var $submitters = $('.field-name-field-issue-files table tr:has(a.dreditor-patchreview) a.username', context);

        // Count and sort by occurrences.
        var submitters = $submitters.countvalues();

        // Build list of unique users for commit attribution, keyed by uid.
        var users = {}, user, uid;
        for (user in $submitters.get()) {
          uid = $submitters[user].href.match(/\d+/)[0];
          users[uid] = {
            id: uid,
            name: $submitters[user].textContent,
            href: $submitters[user].href
          };
        }

        // Retrieve all comments in this issue.
        var $comments = $('section.comments div.comment', context);

        // Build list of top commenters.
        var commenters = $comments.find('div.author a')
          // Skip test bot.
          .not(':contains("System Message")')
          // Add original poster.
          .add('div.node div.submitted a')
          // Count and sort by occurrences.
          .countvalues();
        // Compile a list of top commenters (max. 10% of # of all follow-ups).
        var contributors = [];
        var max = parseInt(($comments.length > 10 ? $comments.length : 10) / 10, 10);
        if (max) {
          $.each(commenters, function(index, name) {
            if (max < 1) {
              return false;
            }
            // Skip already listed contributors.
            for (var i in submitters) {
              if (submitters[i] == name) {
                return;
              }
            }
            contributors.push(name);
            max--;
          });
        }
        // Build commit message.
        // @todo Add configuration option for prefix. For now, manually override:
        //   Drupal.storage.save('commitmessage.prefix', '-');
        var prefix = Drupal.storage.load('commitmessage.prefix');
        prefix = (prefix ? prefix : 'Issue');

        var message = prefix + ' #' + Drupal.dreditor.issue.getNid() + ' ';
        message += 'by ' + submitters.join(', ');
        if (contributors.length) {
          if (submitters.length) {
            message += ' | ';
          }
          // Add a separator between patch submitters and commenters.
          message += contributors.join(', ');
        }

        // Build title.
        var title = Drupal.dreditor.issue.getIssueTitle();

        // Add "Added|Fixed " prefix based on issue category.
        switch ($('#edit-category').val()) {
          case 'bug':
            title = title.replace(/^fix\S*\s*/i, '');
            title = 'Fixed ' + title;
            break;

          case 'feature':
            title = title.replace(/^add\S*\s*/i, '');
            title = 'Added ' + title;
            break;

          default:
            // For anything else, we just ensure proper capitalization.
            if (title[0].toLowerCase() == title[0]) {
              title = title[0].toUpperCase() + title.substring(1);
            }
            break;
        }

        // Add a period (full-stop).
        if (title[title.length - 1] != '.') {
          title += '.';
        }
        message += ': ' + title;

        // Inject a text field.
        var $input = $('#dreditor-commitmessage-input', context);
        if (!$input.length) {
          // Setup first input widget for plain commit message.
          // @todo Revise animation for box-sizing:border-box.
          $input = $('<input id="dreditor-commitmessage-input" class="dreditor-input" type="text" autocomplete="off" />')
            .css({ position: 'absolute', right: $link.outerWidth(), width: 0 })
            .val(message)
            .insertAfter($link);
          $link.css({ position: 'relative', zIndex: 1 }).before($input);

          // Setup second input widget for full git commit command line.
          self.createShellCommand = function (message, user) {
            // -a is evil; people should use apply/am to apply patches, and many
            // use 'git add -p' to selectively stage and commit changes.
            // Also make sure any PHP variables are properly excaped.
            var command = 'git commit -m "' + message.replace(/(\$|")/g, "\\$1") + '"';
            if (user && user.attribution) {
              command += ' --author="' + user.attribution + '"';
            }
            return command;
          };
          var $commandContainer = $('<div id="dreditor-commitmessage-command" style="clear: both; padding: 1em 0;" />')
            .appendTo($container);
          var $commandInput = $('<input class="dreditor-input" type="text" autocomplete="off" />')
            .val(self.createShellCommand(message));
          // Add user list as commit attribution choices.
          for (var user in users) {
            var $userLink = $('<a href="#' + users[user].href + '/git-attribution" class="choice">' + users[user].name + '</a>')
              .data('user', users[user]);
            $userLink.click(function () {
              var link = this;
              // @todo Cache response per user.
              $.getJSON(this.hash.substring(1), function (response) {
                users[user].attribution = response.author;
                $commandInput
                  // Take over current commit message (might have been customized).
                  .val(self.createShellCommand($input.val(), users[user]))
                  .get(0).select();
                $(link).addClass('selected').siblings().removeClass('selected');
              });
              return false;
            });
            $commandContainer.append($userLink);
          }

          $input.animate({ width: $container.width() - $link.width() - 10 }, null, null, function () {
            this.select();

            // Make the commit message text input dynamically attach to the bottom
            // of the viewport upon scrolling.
            var $window = $(window);
            var inputOffset = $input.offset().top;
            var inputOriginalStyle = $input.attr('style');
            $window.scroll(function () {
              if (inputOffset > $window.scrollTop() + $window.height()) {
                $input.css({ position: 'fixed', bottom: 0 });
              }
              else {
                $input.attr('style', inputOriginalStyle);
              }
            });

            // Inject the shell command widget.
            $commandContainer.hide().append($commandInput).slideDown('fast');
          });

          $link.one('click', function () {
            $commandContainer.slideUp('fast');
            $input.animate({ width: 0 }, null, null, function () {
              $commandContainer.remove();
              $input.remove();
            });
            return false;
          });
        }
        return false;
      });
      $link.prependTo($container);
    });
  }
};

/**
 * Attach image attachment inline HTML injector to file attachments.
 */
Drupal.behaviors.dreditorInlineImage = {
  attach: function (context) {
    $('#upload-attachments, #comment-upload-attachments', context).once('dreditor-inlineimage', function () {
      $(this).find('div.description').each(function () {
        var url = $(this).text();
        // Only process image attachments.
        if (!url.match(/\.png$|\.jpg$|\.jpeg$|\.gif$/)) {
          return;
        }
        // Generate inline image button.
        var $button = $('<a class="dreditor-button dreditor-inlineimage" href="javascript:void(0);">Embed</a>').click(function () {
          var desc = $(this).parent().siblings('input').val();
          var image = '<img src="' + url + '" alt="' + desc + '" />';
          // Append image to issue comment textarea (context is AHAH content here).
          $('#edit-body, #edit-comment').val($('#edit-body, #edit-comment').val() + "\n" + image + "\n");
          return false;
        });
        // Append inline image button to attachment.
        $button.appendTo(this);
      });
    });
  }
};

/**
 * Attaches syntax/markup autocompletion to all textareas.
 */
Drupal.behaviors.dreditorSyntaxAutocomplete = {
  attach: function (context) {
    $('textarea', context).once('dreditor-syntaxautocomplete', function () {
      new Drupal.dreditor.syntaxAutocomplete(this);
    });
  }
};

/**
 * @defgroup dreditor_syntaxautocomplete Dreditor syntax autocompletion
 * @{
 */

/**
 * Initializes a new syntax autocompletion object.
 *
 * @param element
 *   A form input element (e.g., textarea) to bind to.
 */
Drupal.dreditor.syntaxAutocomplete = function (element) {
  this.keyCode = 9;
  this.$element = $(element);

  this.$suggestion = $('<span></span>');
  this.$tooltip = $('<div class="dreditor-tooltip">TAB: </div>')
    .insertAfter(this.$element)
    .append(this.$suggestion);

  // Intercept the autocompletion key upon pressing the key. Webkit does not
  // support the keypress event for special keys (such as arrows and TAB) that
  // are reserved for internal browser behavior. Only the keydown event is
  // triggered for all keys.
  // @see http://bugs.jquery.com/ticket/7300
  this.$element.bind('keydown.syntaxAutocomplete', { syntax: this }, this.keypressHandler);
  // After user input has been entered, check for suggestions.
  this.$element.bind('keyup.syntaxAutocomplete', { syntax: this }, this.keyupHandler);
};

/**
 * Responds to keypress events in the bound element to prevent default key event handlers.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.keypressHandler = function (event) {
  var self = event.data.syntax, pos = this.selectionEnd;

  // If the autocompletion key was pressed and there is a suggestion, perform
  // the text replacement.
  // event.which is 0 in the keypress event, so directly compare with keyCode.
  if (event.keyCode == self.keyCode && self.suggestion) {
    // Backup the current scroll position within the textarea. Any manipulation
    // of this.value automatically resets this.scrollTop to zero.
    var scrollTop = this.scrollTop;

    var prefix = this.value.substring(0, pos - self.needle.length);
    var suffix = this.value.substring(pos);
    this.value = prefix + self.suggestion.replace('^', '') + suffix;

    // Move the cursor to the autocomplete position marker.
    var newpos = pos - self.needle.length + self.suggestion.indexOf('^');
    this.setSelectionRange(newpos, newpos);

    // Restore original scroll position.
    this.scrollTop = scrollTop;

    // Remove the tooltip and suggestion directly after executing the
    // autocompletion.
    self.delSuggestion();

    // Do not trigger the browser's default keyboard shortcut.
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
};

/**
 * Responds to keyup events in the bound element.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.keyupHandler = function (event) {
  // Don't interfere with text selections.
  if (this.selectionStart != this.selectionEnd) {
    return;
  }
  // Skip special keystrokes.
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }
  var self = event.data.syntax, pos = this.selectionEnd;
  // Retrieve the needle: The word before the cursor.
  var needle = this.value.substring(0, pos).match(/[^\s>(]+$/);
  // If there is a needle, check whether to show a suggestion.
  // @todo Revamp the entire following conditional code to call
  //   delSuggestion() only once.
  if (needle) {
    self.needle = needle[0];
    // If the needle is found in the haystack of suggestions, show a suggestion.
    var suggestion;
    if (suggestion = self.checkSuggestion(self.needle)) {
      self.setSuggestion(suggestion);
    }
    // Otherwise, ensure a possibly existing last suggestion is removed.
    else {
      self.delSuggestion();
    }
  }
  // Otherwise, ensure there is no suggestion.
  else {
    self.delSuggestion();
  }
};

/**
 * Determines whether there is a suggestion for a given needle.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.checkSuggestion = function (needle) {
  var self = this, suggestion = false;
  $.each(self.suggestions, function () {
    if ($.isFunction(this)) {
      // Use .call() to provide self in this.
      if (suggestion = this.call(self, needle)) {
        return false;
      }
    }
    else if (this[needle]) {
      if (suggestion = this[needle]) {
        return false;
      }
    }
  });
  return suggestion;
};

/**
 * Sets the suggestion and shows the autocompletion tooltip.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.setSuggestion = function (suggestion) {
  var self = this;
  if (suggestion != self.suggestion) {
    self.suggestion = suggestion;
    self.$suggestion.text(self.suggestion.replace('^', ''));
    self.$tooltip.css({ display: 'inline-block' });
  }
};

/**
 * Deletes the suggestion and hides the autocompletion tooltip.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.delSuggestion = function () {
  var self = this;
  delete self.suggestion;
  self.$tooltip.hide();
};

Drupal.dreditor.syntaxAutocomplete.prototype.suggestions = {};

/**
 * Look-up map for simple HTML/markup suggestions.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.suggestions.html = {
  '<?': "<?php\n^\n?>\n",
  '<a': '<a href="^"></a>',
  '<block': "<blockquote>^</blockquote>\n\n",
  '<br': "<br />\n^",
  '<cite': '<cite>^</cite>',
  '<code': '<code>^</code>',
  '<del': '<del>^</del>',
  '<dl': "<dl>\n<dt>^</dt>\n<dd></dd>\n</dl>\n",
  '<dt': "<dt>^</dt>\n<dd></dd>",
  '<dd': '<dd>^</dd>',
  '<em': '<em>^</em>',
  '<h1': "<h1>^</h1>\n",
  '<h2': "<h2>^</h2>\n",
  '<h3': "<h3>^</h3>\n",
  '<h4': "<h4>^</h4>\n",
  '<h5': "<h5>^</h5>\n",
  '<h6': "<h6>^</h6>\n",
  '<hr': "<hr />\n\n^",
  '<img': '<img src="^" />',
  '<li': "<li>^</li>",
  '<ol': "<ol>\n^\n</ol>\n",
  '<p': "<p>^</p>\n",
  '<pre': "<pre>\n^\n</pre>\n",
  '<q': '<q>^</q>',
  '<strong': '<strong>^</strong>',
  '<table': "<table>\n<tr>\n<th>^</th>\n</tr>\n<tr>\n<td></td>\n</tr>\n</table>\n",
  '<tr': "<tr>\n^\n</tr>",
  '<th': "<th>^</th>",
  '<td': "<td>^</td>",
  '<u': '<u>^</u>',
  '<ul': "<ul>\n^\n</ul>\n"
};

/**
 * Suggest a [#issue] conversion for Project Issue input filter.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.suggestions.issue = function (needle) {
  var matches;
  if (matches = needle.match('^https?://drupal.org/node/([0-9]+)')) {
    return '[#' + matches[1] + ']^';
  }
  return false;
};

/**
 * Suggest a username.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.suggestions.user = function (needle) {
  var matches, self = this;
  if (matches = needle.match('^@([a-zA-Z0-9]+)$')) {
    // Performance: Upon first match, setup a username list once.
    if (typeof self.suggestionUserList == 'undefined') {
      self.suggestionUserList = {};
      var seen = {};
      // Add issue author to comment authors and build the suggestion list.
      $('.comment .submitted a').add('div.node div.submitted a').each(function () {
        if (!seen[this.text]) {
          seen[this.text] = 1;
          // Use the shortest possible needle.
          var i, n, name = this.text.toLowerCase();
          for (i = 1; i < name.length; i++) {
            n = name.substring(0, i);
            if (!self.suggestionUserList[n]) {
              self.suggestionUserList[n] = '@' + this.text + '^';
              break;
            }
          }
        }
      });
    }
    if (self.suggestionUserList[matches[1]]) {
      return self.suggestionUserList[matches[1]];
    }
  }
  return false;
};

/**
 * Suggest a comment on issue.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.suggestions.comment = function (needle) {
  var matches, self = this;
  if (matches = needle.match('^#([0-9]+)$')) {
    // Performance: Upon first match, setup a username list once.
    if (typeof self.suggestionCommentList == 'undefined') {
      self.suggestionCommentList = {
        0: 'content'
      };
      // Add issue author to comment authors and build the suggestion list.
      var n, id;
      $('.comment > a').each(function () {
        n = this.text.substring(1);
        id = this.hash.substring(1);
        self.suggestionCommentList[n] = id;
      });
    }
    if (self.suggestionCommentList[matches[1]]) {
      return '<a href="#' + self.suggestionCommentList[matches[1]] + '">#' + matches[1] + '</a>^';
    }
  }
  return false;
};

/**
 * @} End of "defgroup dreditor_syntaxautocomplete".
 */

/**
 * Attach collapsing behavior to user project tables.
 */
Drupal.behaviors.dreditorProjectsCollapse = {
  attach: function (context) {
    var $tables = $('table.projects', context);
    if (!$tables.length) {
      return;
    }
    var enabled = Drupal.storage.load('projectscollapse.status');

    // Add link to toggle this feature.
    $('<a href="#" class="dreditor-application-toggle"></a>')
      .text(enabled ? 'Always show projects' : 'Collapse projects')
      .click(function () {
        Drupal.storage.save('projectscollapse.status', !enabled);
        // Reload the current page without refresh from server.
        window.location.href = window.location.href;
        return false;
      })
      .insertBefore('table.projects:first');

    if (!enabled) {
      return;
    }

    // First table does not have a heading.
    var $heading = $('h2#sandboxes').clone();
    $heading.html($heading.html().replace('Sandbox p', 'P'))
      .removeAttr('id')
      .insertBefore('table.projects:first');

    $tables.once('dreditor-projectscollapse', function () {
      var $table = $(this);
      $heading = $table.prevAll('h2').eq(0);
      $heading.css({ cursor: 'pointer' })
        .bind('click.projectscollapse', function () {
          // .slideToggle() forgets about table width in d.o's outdated jQuery
          // version.
          $table.toggle();
        })
        .triggerHandler('click');
    });
  }
};

/**
 * Attach mark as read to project issue tables.
 */
Drupal.behaviors.dreditorIssueMarkAsRead = {
  attach: function (context) {
    $('table.project-issue', context).once('dreditor-issuemarkasread', function () {
      $(this).find('.marker').addClass('clickable').bind('click.dreditor-markasread', function () {
        var $marker = $(this);
        var $link = $marker.prev('a');
        $.ajax({
          // The actual HTML page output is irrelevant, so denote that by using
          // the appropriate HTTP method.
          type: 'HEAD',
          url: $link.attr('href'),
          complete: function () {
            $marker.remove();
          }
        });
      });
    });
  }
};

/**
 * Attach issue count to project issue tables and hide fixed/needs more info issues without update marker.
 */
Drupal.behaviors.dreditorIssueCount = {
  attach: function (context) {
    $('table.project-issue', context).once('dreditor-issuecount', function () {
      var $table = $(this);
      var countTotal = $table.find('tbody tr').length;
      var countSuffix = ($table.parent().parent().find('.pager').length ? '+' : '');
      var countHidden = 0;

      var $container = $('<div class="dreditor-issuecount"></div>');
      $table.before($container);

      // Add link to toggle this feature.
      var enabled = Drupal.storage.load('issuecount.status');
      $('<a href="#" class="dreditor-application-toggle"></a>')
        .text(enabled ? 'Show all issues' : 'Hide irrelevant issues')
        .click(function () {
          Drupal.storage.save('issuecount.status', !enabled);
          // Reload the current page without refresh from server.
          window.location.href = window.location.href;
          return false;
        })
        .prependTo($container);

      if (enabled) {
        countHidden = $table.find('tr.state-2, tr.state-16').not(':has(.marker)').addClass('dreditor-issue-hidden').hide().length;
      }

      // Output optimized count (minus hidden).
      // Separate calculation required, or otherwise some browsers output NaN.
      var count = countTotal - countHidden;
      $container.append('<span class="dreditor-issuecount-total">Displaying <span class="count">' + count + '</span>' + countSuffix + ' issues.</span>');
      if (!countHidden) {
        return;
      }
      var $counter = $container.find('span.dreditor-issuecount-total span.count');

      // Output 'fixed' count.
      var $issuesFixed = $table.find('tr.state-2.dreditor-issue-hidden');
      if ($issuesFixed.length) {
        $('<a href="#" title="Show" class="dreditor-issuecount-hidden">' + $issuesFixed.length + ' fixed issues.' + '</a>')
          .click(function () {
            $issuesFixed.removeClass('dreditor-issue-hidden').show();
            $counter.text(parseInt($counter.text(), 10) + $issuesFixed.length);
            $(this).remove();
            return false;
          })
          .appendTo($container);
      }

      // Output 'needs more info' count.
      var $issuesInfo = $table.find('tr.state-16.dreditor-issue-hidden');
      if ($issuesInfo.length) {
        $('<a href="#" title="Show" class="dreditor-issuecount-hidden">' + $issuesInfo.length + ' issues need more info.' + '</a>')
          .click(function () {
            $issuesInfo.removeClass('dreditor-issue-hidden').show();
            $counter.text(parseInt($counter.text(), 10) + $issuesInfo.length);
            $(this).remove();
            return false;
          })
          .appendTo($container);
      }
    });
  }
};

/**
 * Prepopulate issue creation form with last used values.
 */
Drupal.behaviors.dreditorIssueValues = {
  attach: function (context) {
    // This catches only the issue creation form, since project issue/release data
    // cannot be altered on node/#/edit.
    $('#node-form:has(#edit-rid)', context).once('dreditor-issuevalues', function () {
      var $form = $(this);
      var values = Drupal.storage.load('issuevalues');
      if (values) {
        $.each(Drupal.storage.unserialize(values), function (name, value) {
          $form.find(':input[name=' + name + ']').val(value);
        });
      }
      $form.submit(function () {
        Drupal.storage.save('issuevalues', Drupal.storage.serialize($('.inline-options:first :input', $form)));
      });
    });
  }
};

/**
 * Cleans up views exposed filter form values before the filter form is submitted.
 *
 * The purpose is that only non-default views filters are contained in the
 * resulting GET query parameters. Better and cleaner for sharing links to a
 * certain filtered issue queue result.
 *
 * Input elements (except multiple selects) always serialize into an empty
 * string, so the entire element needs to be disabled.
 */
Drupal.behaviors.dreditorIssuesFilterFormValuesClean = {
  attach: function (context) {
    $('.view-filters form', context).once('dreditor-issues-form-values-clean', function () {
      $(this).submit(function (event) {
        var $form = $(this);
        $.each(event.target.elements, function (index, element) {
          var $element = $(element);
          var value = $element.val();
          switch (element.name) {
            case 'text':
            case 'assigned':
            case 'submitted':
            case 'participant':
            case 'issue_tags':
              if (value == '') {
                element.disabled = true;
              }
              break;

            case 'status':
              if (value == 'Open') {
                element.disabled = true;
              }
              break;

            case 'priorities':
            case 'categories':
            case 'version':
            case 'component':
              if (value == 'All') {
                element.disabled = true;
              }
              break;

            case 'issue_tags_op':
              if (value == 'or') {
                element.disabled = true;
              }
              break;
          }
        });
      });
    });
  }
};

/**
 * Add a 'Reset' button to project issue exposed views filter form.
 */
Drupal.behaviors.dreditorIssuesFilterFormReset = {
  attach: function (context) {
    if (!window.location.search) {
      return;
    }
    $('.view-filters form', context).once('dreditor-issues-form-reset', function () {
      var $form = $(this);
      var $container = $form.find('input.form-submit').parent();
      var $button = $container.clone().find('input').val('Reset').click(function () {
        // Reload the current page without query string and without refresh.
        Drupal.dreditor.redirect(null, { query: '' });
        return false;
      }).end();
      $container.after($button);
    });
  }
};

/**
 * Attach clone issue button to issues.
 */
Drupal.behaviors.dreditorIssueClone = {
  attach: function (context) {
    var _window = window;
    var $context = $(context);
    $context.find('body.node-type-project-issue:not(.page-node-edit)').once('dreditor-clone-button', function () {
      $('<li><button id="dreditor-clone-button" class="dreditor-button">Clone issue</button></li>')
        .appendTo($context.find('#tabs ul'))
        .find('button').bind('click.dreditor-clone', function () {
          var project = /[^/]*$/.exec($('div.breadcrumb').find('a').attr('href'))[0];
          // Open a new window.
          var w = _window.open('/node/add/project-issue/' + project + '#project-issue-node-form', '_blank');
          $.get(_window.location.pathname + '/edit', function(content) {
            var $edit = $(content);
            $(w).ready(function () {
              setTimeout(function () {
                var $doc = $(w.document);
                $doc.find('#edit-field-issue-version-und').val($edit.find('#edit-field-issue-version-und').val());
                $doc.find('#edit-field-issue-component-und').val($edit.find('#edit-field-issue-component-und').val());
                $doc.find('#edit-field-issue-assigned-und').val($edit.find('#edit-field-issue-assigned-und').val());
                $doc.find('#edit-field-issue-category-und').val($edit.find('#edit-field-issue-category-und').val());
                $doc.find('#edit-field-issue-priority-und').val($edit.find('#edit-field-issue-priority-und').val());
                $doc.find('#edit-field-issue-status-und').val($edit.find('#edit-field-issue-status-und').val());
                $doc.find('#edit-taxonomy-vocabulary-9-und').val($edit.find('#edit-taxonomy-vocabulary-9-und').val());
                $doc.find('.node-form .collapsed').removeClass('collapsed');
                $doc.find('#edit-body-und-0-value').val('Follow-up from [#' + Drupal.dreditor.issue.getNid() + '].\n\n');
                $doc.find('#edit-title').focus();
              }, 10);
            });
          });
        });
    });
  }
};

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

// Add custom stylesheet.
var styles = document.createElement("style");
styles.setAttribute('type', 'text/css');
document.getElementsByTagName('head')[0].appendChild(styles);

styles.innerHTML = " \
#dreditor-wrapper { position: fixed; z-index: 1000; width: 100%; top: 0; } \
#dreditor { position: relative; width: 100%; height: 100%; background-color: #fff; border: 1px solid #ccc; } \
#dreditor #bar, #dreditor-actions { padding: 0 10px; font: 10px/18px sans-serif, verdana, tahoma, arial; min-width: 230px; } \
#dreditor #bar { position: absolute; height: 100%; } \
#dreditor-actions { bottom: 0; left: -5px; padding-top: 5px; padding-bottom: 5px; position: absolute; } \
.dreditor-button, .dreditor-button:link, .dreditor-button:visited, #content a.dreditor-button { background: rgb(122,188,255); \
  background: -moz-linear-gradient(top, rgba(122,188,255,1) 0%, rgba(96,171,248,1) 44%, rgba(64,150,238,1) 100%); \
  background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(122,188,255,1)), color-stop(44%,rgba(96,171,248,1)), color-stop(100%,rgba(64,150,238,1))); \
  background: -webkit-linear-gradient(top, rgba(122,188,255,1) 0%,rgba(96,171,248,1) 44%,rgba(64,150,238,1) 100%); \
  background: -o-linear-gradient(top, rgba(122,188,255,1) 0%,rgba(96,171,248,1) 44%,rgba(64,150,238,1) 100%); \
  background: -ms-linear-gradient(top, rgba(122,188,255,1) 0%,rgba(96,171,248,1) 44%,rgba(64,150,238,1) 100%); \
  background: linear-gradient(to bottom, rgba(122,188,255,1) 0%,rgba(96,171,248,1) 44%,rgba(64,150,238,1) 100%); \
  filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#7abcff', endColorstr='#4096ee',GradientType=0 ); \
  border: 1px solid #3598E8; color: #fff; cursor: pointer; font-size: 11px; font-family: sans-serif, verdana, tahoma, arial; font-weight: bold; padding: 0.1em 0.8em; text-transform: uppercase; text-decoration: none; -moz-border-radius: 3px; -webkit-border-radius: 3px; border-radius: 3px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); } \
.dreditor-button:hover, #content a.dreditor-button:hover { background: rgb(145,200,255); \
  background: -moz-linear-gradient(top, rgba(145,200,255,1) 0%, rgba(96,171,248,1) 44%, rgba(94,166,237,1) 100%); \
  background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(145,200,255,1)), color-stop(44%,rgba(96,171,248,1)), color-stop(100%,rgba(94,166,237,1))); \
  background: -webkit-linear-gradient(top, rgba(145,200,255,1) 0%,rgba(96,171,248,1) 44%,rgba(94,166,237,1) 100%); \
  background: -o-linear-gradient(top, rgba(145,200,255,1) 0%,rgba(96,171,248,1) 44%,rgba(94,166,237,1) 100%); \
  background: -ms-linear-gradient(top, rgba(145,200,255,1) 0%,rgba(96,171,248,1) 44%,rgba(94,166,237,1) 100%); \
  background: linear-gradient(to bottom, rgba(145,200,255,1) 0%,rgba(96,171,248,1) 44%,rgba(94,166,237,1) 100%); \
  filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#91c8ff', endColorstr='#5ea6ed',GradientType=0 ); } \
.dreditor-button:active, #content a.dreditor-button:active { background: rgb(64,150,238); \
  background: -moz-linear-gradient(top, rgba(64,150,238,1) 0%, rgba(96,171,248,1) 56%, rgba(122,188,255,1) 100%); \
  background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(64,150,238,1)), color-stop(56%,rgba(96,171,248,1)), color-stop(100%,rgba(122,188,255,1))); \
  background: -webkit-linear-gradient(top, rgba(64,150,238,1) 0%,rgba(96,171,248,1) 56%,rgba(122,188,255,1) 100%); \
  background: -o-linear-gradient(top, rgba(64,150,238,1) 0%,rgba(96,171,248,1) 56%,rgba(122,188,255,1) 100%); \
  background: -ms-linear-gradient(top, rgba(64,150,238,1) 0%,rgba(96,171,248,1) 56%,rgba(122,188,255,1) 100%); \
  background: linear-gradient(to bottom, rgba(64,150,238,1) 0%,rgba(96,171,248,1) 56%,rgba(122,188,255,1) 100%); \
  filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#4096ee', endColorstr='#7abcff',GradientType=0 ); } \
.dreditor-button { margin: 0 0.5em 0.5em; } \
.dreditor-patchreview, .dreditor-patchtest { float: right; line-height: 1.25em; margin: 0 0 0 1em; } \
#dreditor h3 { margin: 18px 0 0; }\
#dreditor #menu { margin: 0; max-height: 30%; overflow-y: scroll; padding: 0; } \
#dreditor #menu li { list-style: none; margin: 0; white-space: nowrap; } \
#dreditor #menu li li { padding: 0 0 0 1em; } \
#dreditor #menu > li > a { display: block; padding: 0 0 0 0.2em; background-color: #f0f0f0; } \
#dreditor a { text-decoration: none; background: transparent; } \
#dreditor .form-textarea { width: 100%; height: 12em; font: 13px Consolas, 'Liberation Mono', Courier, monospace; color: #000; } \
#dreditor .resizable-textarea { margin: 0 0 9px; } \
#dreditor-content { margin-left: 250px; border-left: 1px solid #ccc; overflow: scroll; height: 100%; } \
#dreditor-content, #code tr, #code td { font: 13px/18px Consolas, 'Liberation Mono', Courier, monospace; } \
#dreditor #code { position: relative; width:100%; -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } \
#dreditor #code td { overflow: hidden; padding: 0 10px; } \
#dreditor #code .ln { -webkit-user-select: none; width:1px; border-right: 1px solid #e5e5e5; text-align: right; } \
#dreditor #code .ln:before { content: attr(data-line-number); } \
#dreditor #code tr { background: transparent; border: 0; color: #aaa; margin: 0; padding: 0; } \
#dreditor #code .pre { white-space: pre; background: transparent; position: relative; } \
#dreditor #code .pre .line-ruler { background: #ccc; background: rgba(0,0,0,0.15); position: absolute; bottom: -4px; top: -4px; width: 1px; visibility: hidden; z-index: 1; } \
#dreditor #code tr:hover .pre .line-ruler { background-color: #E8DAB3; background-color: rgba(154, 124, 41, 0.3); } \
#dreditor #code .pre span.space { display: inline-block; margin-left: 1px; width: 2px; height: 7px; background-color: #ddd; } \
#dreditor #code .pre span.error { background-color: #f99; line-height: 100%; width: auto; height: auto; border: 0; } \
#dreditor #code .pre span.error.eof { color: #fff; background-color: #f66; } \
#dreditor #code .pre span.error.tab { background-color: #fdd; } \
#dreditor #code .pre span.hidden { display: none; } \
#dreditor #code tr.file { color: #708E9E; background-color: #E8F1F6; } \
#dreditor #code tr.file a { color: #708E9E; } \
#dreditor #code tr.file .ln { background-color: #DAEAF3; border-color: #BFD4EE; } \
#dreditor #code tr.old { background-color: #fdd; color: #CC0000; } \
#dreditor #code tr.old a { color: #CC0000; } \
#dreditor #code tr.old .ln { background-color: #f7c8c8; border-color: #e9aeae; } \
#dreditor #code tr.old .line-ruler { background-color: #B53B3B; background-color: rgba(181, 59, 59, 0.2); } \
#dreditor #code tr.new { background-color: #dfd; color: #00AA00; float: none; font-size: 100%; font-weight: normal; } \
#dreditor #code tr.new a { color: #00AA00; } \
#dreditor #code tr.new .ln { background-color: #ceffce; border-color: #b4e2b4; } \
#dreditor #code tr.new .line-ruler { background-color: #167A00; background-color: rgba(22, 122, 0, 0.2); } \
#dreditor #code .comment { color: #070; } \
\
tr.selected td { background: transparent; } \
#dreditor #code tr.has-comment { background: #ffc; } \
#dreditor #code tr.has-comment .ln { background: #FFF0B8;  border-color: #EEDB91; } \
#dreditor #code tr.selected, #dreditor #code tr.pre-selected { background: #ffc; cursor: pointer; } \
#dreditor #code tr.selected .ln, #dreditor #code tr.pre-selected .ln { background: #FFEFB3;  border-color: #ECD784; } \
\
#dreditor #code tr:hover, #dreditor #code tr:hover td, #dreditor #code tr:hover td a { background: #FFFFEC !important; border-color: #FCD773 !important; color: #A77E00 !important; cursor: pointer; } \
#dreditor #code tr:hover td { box-shadow: 0px -1px 0 0px #FCD773 inset, 0px 1px 0 0px #FCD773 inset; } \
\
.element-invisible { clip: rect(1px, 1px, 1px, 1px); position: absolute !important; } \
.admin-link { font-size: 11px; font-weight: normal; text-transform: lowercase; } \
#dreditor-overlay { margin-top: 18px; font-size: 13px; } \
#column-left { z-index: 2; /* Required, or issue summary widget would be below site header. */ } \
#dreditor-widget { position: fixed; bottom: 0; left: 2%; width: 94%; z-index: 10; overflow: auto; padding: 0 1em 1em; background-color: #fff; -moz-box-shadow: 0 0 20px #bbb; box-shadow: 0 0 20px #bbb; -moz-border-radius: 8px 8px 0 0; border-radius: 8px 8px 0 0; } \
 \
.dreditor-actions { overflow: hidden; position: relative; } \
a.dreditor-application-toggle { display: inline-block; padding: 0.05em 0.3em; line-height: 150%; border: 1px solid #ccc; background-color: #fafcfe; font-weight: normal; text-decoration: none; } \
a.dreditor-application-toggle.active { border-color: #48e; background-color: #4af; color: #fff; } \
#content a.dreditor-application-toggle { float: right; margin: 0 0 0 0.5em; } \
.dreditor-input { border: 1px solid #ccc; padding: 0.2em 0.3em; font-size: 100%; line-height: 150%; -moz-box-sizing: border-box; box-sizing: border-box; width: 100%; } \
.choice { display: inline-block; margin: 0 0.33em 0.4em 0; padding: 0.2em 0.7em; border: 1px solid #ccc; background-color: #fafcfe; -moz-border-radius: 5px; border-radius: 5px; } \
.choice.selected { background-color: #2e96d5; border: 1px solid #28d; color: #fff; } \
 \
div.dreditor-issuecount { line-height: 200%; } \
.dreditor-issuecount a { padding: 0 0.3em; } \
.marker.clickable { cursor: pointer; } \
 \
#content .fieldset-flat { display: block; border: 0; width: auto; padding: 0; } \
.fieldset-flat > legend { display: none; } \
#dreditor-issue-data #edit-title-wrapper { margin-top: 0; } \
#dreditor-issue-data .inline-options .form-item { margin-bottom: 0.3em; } \
\
.dreditor-tooltip { display: none; position: fixed; bottom: 0; background-color: #ffffbf; border: 1px solid #000; padding: 0 3px; font-family: sans-serif; font-size: 11px; line-height: 150%; } \
\
/* Drupal.org Styling Fixes */\
\
#comment-form textarea { min-height: 200px; } \
.field-name-field-issue-files table, .field-name-field-issue-changes table.nodechanges-file-changes { width: 100%; } \
.extended-file-field-table-cid, th[name=\"extended-file-field-table-header-cid\"] { width: 100px; word-wrap: break-word; } \
.field-name-field-issue-changes table td .file { display: block; } \
td.extended-file-field-table-cid { text-align: right; } \
td.extended-file-field-table-cid .username { color: #777; display: block; font-size: 10px; } \
td.extended-file-field-table-filename .file, tr.pift-file-info .file { font-weight: 600; } \
td.extended-file-field-table-filename .file a, tr.pift-file-info .file a { display: block; overflow: hidden; } \
td.extended-file-field-table-filename .file .file-icon, tr.pift-file-info .file .file-icon { float: left; margin-right: .5em; } \
td.extended-file-field-table-filename .file .size, tr.pift-file-info .file .size { color: #999; float: right; font-size: 10px; margin-left: .5em; } \
tr.extended-file-field-table-row td, .field-name-field-issue-changes table.nodechanges-file-changes td { padding: .75em; } \
tr.extended-file-field-table-row:not(.pift-test-info) td.pift-pass, tr.extended-file-field-table-row:not(.pift-test-info) td.pift-fail, table.nodechanges-file-changes .pift-file-info td.pift-pass, table.nodechanges-file-changes .pift-file-info td.pift-fail { padding-bottom: 0; } \
tr.pift-test-info td { font-size: 11px; font-style: italic; padding: 0.5em .75em .75em 2.9em; } \
div.pift-operations { color: inherit; float: right; font-size: 10px; font-style: normal; font-weight: 600; margin-left: 1em; text-transform: uppercase; } \
td.pift-pass { background: #DDFFDD; color: #00AA00; } \
tr.extended-file-field-table-row td.pift-pass { border-color: #87CF87; } \
tr.extended-file-field-table-row td.pift-fail { border-color: #EEBBBB; } \
td.pift-fail { background: #FFECEC; color: #CC0000; } \
td.pift-pass a, td.pift-fail a, td.pift-pass .file .size, td.pift-fail .file .size { color: inherit; } \
";

// Invoke Dreditor update check once.
Drupal.dreditor.updateCheck();

// End of Content Scope Runner.
}

// If not already running in the page, inject this script into the page.
if (typeof __PAGE_SCOPE_RUN__ == 'undefined') {
  // Define a closure/function in the global scope in order to reference the
  // function caller (the function that executes the user script itself).
  (function page_scope_runner() {
    // Retrieve the source of dreditor_loader, inject and run.
    var self_src = '(' + dreditor_loader.toString() + ')(jQuery);';

    // Add the source to a new SCRIPT DOM element; prepend it with the
    // __PAGE_SCOPE_RUN__ marker.
    // Intentionally no scope-wrapping here.
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.textContent = "var __PAGE_SCOPE_RUN__ = true;\n" + self_src;

    // Inject the SCRIPT element into the page.
    var head = document.getElementsByTagName('head')[0];
    head.appendChild(script);
  })();

  // End execution. This code path is only reached in a GreaseMonkey/user
  // script environment. User script environment implementations differ; not all
  // browsers (e.g., Opera) understand a return statement here, and it would
  // also prevent inclusion of this script in unit tests. Therefore, the entire
  // script needs to be wrapped in a condition.
}
// Drupal is undefined when drupal.org is down.
else if (typeof Drupal == 'undefined') {
}
// Execute the script as part of the content page.
else {
  dreditor_loader(jQuery);
}
