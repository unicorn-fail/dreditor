// ==UserScript==
// @name           Dreditor
// @namespace      http://drupal.org/project/dreditor
// @description    Awesomeness for drupal.org.
// @author         Daniel F. Kudwien (sun)
// @version        0.1
// @include        http://drupal.org/node/*
// @include        http://drupal.org/comment/reply/*
// @include        http://drupal.org/project/*
// @include        http://drupal.org/node/add/project-issue/*
// ==/UserScript==

// Initialize window objects.
$ = window.$ = window.jQuery = unsafeWindow.jQuery;
Drupal = window.Drupal = unsafeWindow.Drupal;
// Bail out in (the unlikely) case that JS has been disabled.
if (Drupal === undefined) {
  return false;
}

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
    // Setup debug storage in global window. We want to look into it.
    window.debug = unsafeWindow.debug = window.debug || [];

    args = jQuery.makeArray(arguments);
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
var sortOrder;

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

// Forward compatibility with D7.
if (typeof $.fn.once == 'undefined') {
/**
 * jQuery Once Plugin v1.2
 * http://plugins.jquery.com/project/once
 */
(function ($) {
  var cache = {}, uuid = 0;

  /**
   * Filters elements by whether they have not yet been processed.
   */
  $.fn.once = function (id, fn) {
    if (typeof id != 'string') {
      // Generate a numeric ID if the id passed can't be used as a CSS class.
      if (!(id in cache)) {
        cache[id] = ++uuid;
      }
      // When the fn parameter is not passed, we interpret it from the id.
      if (!fn) {
        fn = id;
      }
      id = 'jquery-once-' + cache[id];
    }
    // Remove elements from the set that have already been processed.
    var name = id + '-processed';
    var elements = this.not('.' + name).addClass(name);

    return $.isFunction(fn) ? elements.each(fn) : elements;
  };

  /**
   * Filters elements that have been processed once already.
   */
  $.fn.removeOnce = function (id, fn) {
    var name = id + '-processed';
    var elements = this.filter('.' + name).removeClass(name);

    return $.isFunction(fn) ? elements.each(fn) : elements;
  };
})(jQuery);
}

/**
 * @} End of "defgroup jquery_extensions".
 */

Drupal.dreditor = {
  behaviors: {},

  /**
   * Global Dreditor configuration object.
   *
   * @see confInit()
   */
  conf: '',

  /**
   * Convert serialized global configuration into an object.
   *
   * To leverage Greasemonkey's user script variable storage, which cannot be
   * accessed or altered from within the unsafeWindow context (the original
   * context of jQuery), we build and use our own configuration storage.
   * Drupal.dreditor.conf is a serialized string (using jQuery.param(), which
   * jQuery also uses to serialize form values) that is converted into an object
   * when the script is executed and converted back into a serialized string
   * when the page unloads. Nifty! :)
   *
   * Note that this only supports simple values (numbers, booleans, strings)
   * and only an one-dimensional (flat) associative configuration object (due to
   * limitations of jQuery.param()).
   */
  confInit: function () {
    this.conf = this.unserialize(this.conf);
  },

  /**
   * Unserialize a serialized string.
   */
  unserialize: function (str) {
    var obj = {};
    jQuery.each(str.split('&'), function() {
      var splitted = this.split('=');
      if (splitted.length != 2) {
        return;
      }
      var key = splitted[0];
      var val = decodeURIComponent(splitted[1].replace(/\+/g, ' '));
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
      // Ignore empty values.
      if (typeof val == 'number' || typeof val == 'boolean' || val.length > 0) {
        obj[key] = val;
      }
    });
    return obj;
  },

  setup: function (context) {
    var self = this;
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
    $('<ul id="menu"></ul>').appendTo($bar);

    // Add content region.
    $('<div id="dreditor-content"></div>').appendTo(self.$dreditor);

    // Add global Dreditor buttons container.
    var $actions = $('<div id="dreditor-actions"></div>');
    // Add hide/show button to temporarily dismiss Dreditor.
    $('<input id="dreditor-hide" class="dreditor-button" type="button" value="Hide" />')
      .toggle(
        function () {
          self.hide();
        },
        function () {
          self.show();
        }
      )
      .appendTo($actions);
    // Add cancel button to tear down Dreditor.
    $('<input id="dreditor-cancel" class="dreditor-button" type="button" value="Cancel" />')
      .click(function () {
        Drupal.dreditor.tearDown(context);
        return false;
      })
      .appendTo($actions);
    $actions.appendTo(self.$dreditor);

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
    self.$wrapper.animate({ height: 0 }, function () {
      $('body', context).css({ overflow: 'auto' });
      $(this).remove();
      delete self.$dreditor;
      delete self.$wrapper;
    });
  },

  /**
   * Hide Dreditor.
   */
  hide: function () {
    var self = this;
    var button = self.$dreditor.find('#dreditor-hide').get(0);
    button.value = 'Show';
    self.$wrapper.animate({ height: 34 }, function () {
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
    var button = self.$dreditor.find('#dreditor-hide').get(0);
    self.$dreditor.find('> div:not(#dreditor-actions)').show();
    $('body').css({ overflow: 'hidden' });
    self.$wrapper.animate({ height: '100%' }, function () {
      button.value = 'Hide';
    });
    return false;
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
    $(selector).get(0).scrollIntoView();
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
 * @defgroup form_api JavaScript port of Form API
 * @{
 */

/**
 * Dreditor JavaScript form API.
 *
 * Due to Greasemonkey limitations, we have to instantiate new form objects in
 * a wrapper object to pass Drupal.dreditor.form as context to the prototype.
 */
Drupal.dreditor.form = {
  forms: [],

  create: function (id) {
    // We must pass this as wrapping object.
    return new this.form(this, id);
  }
};

Drupal.dreditor.form.form = function (o, id) {
  var self = this;

  // Turn this object into a jQuery object, being a form. :)
  $.extend(true, self, $('<form id="' + id + '"></form>'));

  // Override the default submit handler.
  self.submit(function (e) {
    // Invoke the submit handler of the clicked button.
    var op = e.originalEvent.explicitOriginalTarget.value;
    if (self.submitHandlers[op]) {
      self.submitHandlers[op](this, self);
    }
    // Unless proven wrong, we remove the form after submission.
    self.remove();
    // We never really submit.
    return false;
  });
};

Drupal.dreditor.form.form.prototype = {
  submitHandlers: {},

  addButton: function (op, onSubmit) {
    this.submitHandlers[op] = onSubmit;
    this.append('<input name="op" class="dreditor-button" type="submit" value="' + op + '" />');
    // Return the jQurey form object to allow for chaining.
    return this;
  }
};

/**
 * @} End of "defgroup form_api".
 */

/**
 * Attach patch review editor to issue attachments.
 */
Drupal.behaviors.dreditorPatchReview = function (context) {
  // d.o infrastructure -- are you nuts?!
  $('#attachments, table.comment-upload-attachments, div[id^=pift-results]', context).once('dreditor-patchreview', function () {
    $('a', this).each(function () {
      if (this.href.match(/\.(patch|diff|txt)/)) {
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
        $link.appendTo(this.parentNode);
      }
    });
  });
};

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

  edit: function () {
    var self = this;
    // Mark current selection/commented code as selected.
    $(self.data.elements).addClass('selected');

    // Add Pastie.
    if (!self.$form) {
      self.$form = Drupal.dreditor.form.create('pastie');
      // Add comment textarea.
      self.$form.append('<textarea name="comment" class="form-textarea resizable" rows="10"></textarea>');
      // Add comment save button.
      self.$form.addButton((self.data.id !== undefined ? 'Update' : 'Save'), function (form, $form) {
        // @todo For any reason, FF 3.5 breaks when trying to access
        //   form.comment.value. Works in FF 3.0.x. WTF?
        var value = $form.find('textarea').val();
        // Store new comment, if non-empty.
        if ($.trim(value).length) {
          self.comment.save({
            id: self.data.id,
            elements: self.data.elements,
            comment: value
          });
        }
        // Reset pastie.
        self.reset();
      });
      // Add comment cancel button.
      self.$form.addButton('Cancel', function (form, $form) {
        // Reset pastie.
        self.reset();
      });
      // Add comment delete button for existing comments.
      if (self.data.id !== undefined) {
        self.$form.addButton('Delete', function (form, $form) {
          self.comment.delete(self.data.id);
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
   * Return currently selected code lines as jQuery object.
   */
  getSelection: function () {
    var elements = [];

    var range = window.getSelection().getRangeAt(0);
    if (!range.toString()) {
      return elements;
    }

    // Grep selected lines.
    var next = range.startContainer;
    var last = range.endContainer;
    // If start/end containers are a text node, retrieve the parent node.
    while (next && next.nodeName != 'PRE') {
      next = next.parentNode;
    }
    while (last && last.nodeName != 'PRE') {
      last = last.parentNode;
    }
    // If full lines where selected, retrieve the line right before the end of
    // selection.
    if (range.endOffset == 0) {
      last = last.previousSibling;
    }

    while (next && next != last) {
      elements.push(next);
      next = next.nextSibling;
    }
    elements.push(last);
    return elements;
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
    this.comment.comments.sort(this.sort);
    $.each(this.comment.comments, function (index, comment) {
      // Skip deleted (undefined) comments; this would return window here.
      if (!comment) {
        return true;
      }
      var $elements = $(this.elements);
      html += '<code>\n';
      // Add file information.
      var lastfile = $elements.eq(0).prevAll('pre.file:has(> a.file)').get(0);
      if (lastfile) {
        html += lastfile.textContent + '\n';
      }
      // Add hunk information.
      var lasthunk = $elements.eq(0).prevAll('pre.file').get(0);
      if (lasthunk) {
        html += lasthunk.textContent + '\n';
      }

      var lastline = $elements.get(0).previousSibling;
      var lastfileNewlineAdded;

      $elements.each(function () {
        var $element = $(this);
        lastfileNewlineAdded = false;
        // Add new last file, in case a comment spans over multiple files.
        if (lastfile && lastfile != $element.prevAll('pre.file:has(> a.file)').get(0)) {
          lastfile = $element.prevAll('pre.file:has(> a.file)').get(0);
          html += '\n' + lastfile.textContent + '\n';
          lastfileNewlineAdded = true;
        }
        // Add new last hunk, in case a comment spans over multiple hunks.
        if (lasthunk && lasthunk != $element.prevAll('pre.file').get(0)) {
          lasthunk = $element.prevAll('pre.file').get(0);
          // Only add a newline if there was no new file already.
          if (!lastfileNewlineAdded) {
            html += '\n';
            lastfileNewlineAdded = true;
          }
          html += lasthunk.textContent + '\n';
        }
        // Add a delimiter, in case a comment spans over multiple selections.
        else if (lastline && lastline != $element.get(0).previousSibling) {
          html += '...\n';
        }
        html += $element.text() + '\n';

        // Use this line as previous line for next line.
        lastline = $element.get(0);
      });

      html += '</code>\n';
      html += '\n' + this.comment + '\n\n';
    });
    // Let's get some attention! :)
    function shuffle(array) {
      for(var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);
      return array;
    }
    var messages = [
      'Powered by <a href="@dreditor-url">Dreditor</a>.'
    ];
    // Add Drupal core specific messages.
    var daysToCodeFreeze = 0, criticalIssueCount = 0;
    if ($('#edit-project-info-project-title').val() == 'Drupal') {
      // Code freeze specific messages.
      daysToCodeFreeze = parseInt((new Date(2010, 1 - 1, 15) - new Date()) / 1000 / 60 / 60 / 24, 10);
      if (daysToCodeFreeze > 0) {
        $.merge(messages, [
          '@days to code freeze.  <a href="@dreditor-url">Better review yourself.</a>'
        ]);
      }
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
    var message = shuffle(messages)[0];
    message = message.replace('@dreditor-url', 'http://drupal.org/project/dreditor');
    message = message.replace('@days', daysToCodeFreeze + ' days');
    message = message.replace('@critical-count', criticalIssueCount);
    html += '\n\n<em>' + message + '</em>\n';

    // Paste comment into issue comment textarea.
    var $commentField = $('#edit-comment');
    $commentField.val($commentField.val() + html);
    // Jump to the issue comment textarea after pasting.
    Drupal.dreditor.goto('#edit-comment');
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

  delete: function (id) {
    var data = this.load(id);
    if (data && data.id !== undefined) {
      $(data.elements)
        .removeClass('has-comment')
        .removeClass('comment-id-' + id)
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
  var $code = $('<div id="code"></div>');
  var $menu = $('#menu', context);
  var $lastFile = $('<li>Parse error</li>');
  var $diffstat = $('<div id="diffstat"></div>').appendTo('#dreditor #bar');
  var diffstat = { files: 0, insertions: 0, deletions: 0 };

  code = code.split('\n');
  for (var n in code) {
    var line = code[n];
    // Build file menu links.
    line = line.replace(/^(\+\+\+ )([^\s]+)(\s.*)?/, function (full, match1, match2, match3) {
      var id = match2.replace(/[^A-Za-z_-]/g, '');
      $lastFile = $('<li><a href="#' + id + '">' + match2 + '</a></li>');
      $menu.append($lastFile);
      diffstat.files++;
      return match1 + '<a class="file" id="' + id + '">' + match2 + '</a>' + match3;
    });
    // Build hunk menu links for file.
    line = line.replace(/^(@@ .+ @@\s+)([^\s]+\s[^\s\(]*)/, function (full, match1, match2) {
      var id = match2.replace(/[^A-Za-z_-]/g, '');
      $lastFile.append('<li><a href="#' + id + '">' + match2 + '</a></li>');
      return match1 + '<a class="hunk" id="' + id + '">' + match2 + '</a>';
    });

    var classes = [], syntax = false;
    // Colorize file diff lines.
    if (line.match(/^((Index|===|RCS|retrieving|diff|\-\-\- |\+\+\+ |@@ ).*)$/i)) {
      classes.push('file');
    }
    // Colorize old code, but skip file diff lines.
    else if (line.match(/^((?!\-\-\-)\-.*)$/)) {
      classes.push('old');
      diffstat.deletions++;
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
    }
    // Skip entirely empty lines (in diff files, this is only the last newline).
    else if (!line.length) {
      continue;
    }
    // Detect missing newline at end of file.
    else if (line.match(/.*No newline at end of file.*/i)) {
      line = '<span class="error eof">' + line + '</span>';
    }
    else {
      // @todo Also colorizing unchanged lines makes added comments almost
      //   invisible. Although we could use .new.comment as CSS selector, the
      //   question of a sane color scheme remains.
      // syntax = true;
    }
    // Colorize comments.
    if (syntax && line.match(/^. +\/\/|^.\/\*[\* ]|^. \*/)) {
      classes.push('comment');
    }
    // Wrap all lines in PREs for copy/pasting.
    classes = (classes.length ? ' class="' + classes.join(' ') + '"' : '');
    line = '<pre' + classes + '>' + line + '<span /></pre>';

    // Append line to parsed code.
    $code.append(line);
  }
  // Append to body...
  $('#dreditor-content', context)
    // a container to visualize the 80 chars delimiter.
    .append('<div id="code-delimiter"></div>')
    // the parsed code.
    .append($code);

  // Append diffstat to sidebar.
  $diffstat.html(diffstat.files + '&nbsp;files changed, ' + diffstat.insertions + '&nbsp;insertions, ' + diffstat.deletions + '&nbsp;deletions.');

  // Attach pastie to any selection.
  $code.mouseup(function (e) {
    // Only act on left/first mouse button.
    if (e.which != 1) {
      return;
    }
    var elements = Drupal.dreditor.patchReview.getSelection();
    if (elements.length) {
      Drupal.dreditor.patchReview.add(elements);
      // Display pastie.
      Drupal.dreditor.patchReview.edit();
    }
    return false;
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
    var $save = $('<input id="dreditor-save" class="dreditor-button" type="submit" value="Paste" />');
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
        $('#code pre.old', context).addClass('element-invisible');
        $link.text('Show deletions');
        this.blur();
        return false;
      },
      function () {
        $('#code pre.old', context).removeClass('element-invisible');
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
 * Streamline issue comment form.
 *
 * Altering of the form makes certain browsers (such as Firefox) no longer find
 * the form fields upon page refresh (i.e. effective result like
 * autocomplete="off"), so we need to work with CSS tricks.
 *
 * Moving form elements around, unwrapping them, and similar actions are not
 * supported.
 */
Drupal.behaviors.dreditorIssueCommentForm = function (context) {
  $('#comment-form:has(#edit-category)', context).once('dreditor-issue-comment-form', function () {
    var $form = $('> div', this);
    // Remove that ugly looking heading.
    $form.parents('.content').prev('h2').remove();

    // Since we cannot move DOM elements around, we need to use advanced CSS
    // positioning to achieve a sane order of form elements.
    $form.css({ position: 'relative', paddingTop: '19em' });

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
    $form
      .children('.form-item:last')
        .css({ position: 'absolute', top: '16.5em', width: '100%', margin: 0 })
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
};

/**
 * Attach commit message generator to issue comment form.
 */
Drupal.behaviors.dreditorCommitMessage = function (context) {
  // Attach this behavior only to project_issue nodes. Use a fast selector for
  // the common case, but also support comment/reply/% pages.
  if (!($('body.node-type-project-issue', context).length || $('div.project-issue', context).length)) {
    return;
  }
  $('#edit-comment-wrapper', context).once('dreditor-commitmessage', function () {
    var $container = $('.dreditor-actions', this);
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
      // Retrieve all comments in this issue.
      var $comments = $('#comments div.comment', context);
      // Build list of top patch submitters.
      var submitters = $comments
        // Filter comments by those having patches.
        .filter(':has(a.dreditor-patchreview)').find('div.submitted a')
        // Add original post if it contains a patch.
        .add('div.node:has(a.dreditor-patchreview) div.submitted a')
        // Count and sort by occurrences.
        .countvalues();
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
      var message = '#' + window.location.href.match(/node\/(\d+)/)[1] + ' ';
      message += 'by ' + submitters.join(', ');
      if (contributors.length) {
        if (submitters.length) {
          message += ' | ';
        }
        // Add a separator between patch submitters and commenters.
        message += contributors.join(', ');
      }
      // Build title.
      // Replace double quotes with single quotes for cvs command line.
      var title = $('h1#page-subtitle').text().replace('"', "'", 'g');
      // Add "Added|Changed|Fixed " prefix based on issue category.
      switch ($('#edit-category').val()) {
        case 'bug':
          title = 'Fixed ' + title;
          break;

        case 'feature':
          title = 'Added ' + title;
          break;

        case 'task':
          title = 'Changed ' + title;
          break;

        default:
          // For anything else, we just ensure proper capitalization.
          if (title[0].toLowerCase() == title[0]) {
            title = title[0].toUpperCase() + title.substring(1);
          }
          break;
      }
      // Try to fix function names without parenthesis.
      title = title.replace(/([a-z_]+_[a-z_]+)\b(?!\(\))/g, '$&()');
      // Add a period (full-stop).
      if (title[title.length - 1] != '.') {
        title += '.';
      }
      message += ': ' + title;

      // Inject a text field.
      var $input = $('#dreditor-commitmessage-input', context);
      if (!$input.length) {
        $input = $('<input id="dreditor-commitmessage-input" class="dreditor-input" type="text" autocomplete="off" />')
          .css({ position: 'absolute', right: $link.width(), width: 0 })
          .val(message);
        $link.css({ position: 'relative', zIndex: 1 }).before($input);
        $input.animate({ width: $container.width() - $link.width() - 10 }, null, null, function () {
          this.select();
        });
        $link.one('click', function () {
          $input.animate({ width: 0 }, null, null, function () {
            $input.remove();
          });
          return false;
        });
      }
      return false;
    });
    // Prepend commit message button to comment form.
    // @todo Generalize this setup. Somehow.
    if (!$container.length) {
      $container = $('<div class="dreditor-actions" style="width: 95%"></div>');
      $(this).prepend($container);
    }
    $link.prependTo($container);
  });
};

/**
 * Attach image attachment inline HTML injector to file attachments.
 */
Drupal.behaviors.dreditorInlineImage = function (context) {
  // Do nothing if the user does not have access to the "Documentation" input
  // format.
  if (!$('#edit-format-5').length) {
    return;
  }
  $('#upload-attachments, #comment-upload-attachments', context).once('dreditor-inlineimage', function () {
    $(this).find('div.description').each(function () {
      var url = $(this).text();
      // Only process image attachments.
      if (!url.match(/\.png$|\.jpg$|\.jpeg$|\.gif$/)) {
        return;
      }
      // Fix bug in comment_upload's preview issue attachment URLs.
      url = url.replace(/\/files\/(?!issues\/)/, '/files/issues/');
      // Generate inline image button.
      var $button = $('<a class="dreditor-button dreditor-inlineimage" href="javascript:void(0);">Embed</a>').click(function () {
        var desc = $(this).parent().siblings('input').val();
        var image = '<img src="' + url + '" alt="' + desc + '" />';
        // Append image to issue comment textarea (context is AHAH content here).
        $('#edit-body, #edit-comment').val($('#edit-body, #edit-comment').val() + "\n" + image + "\n");
        // Ensure the "Documentation" input format is enabled.
        $('#edit-format-5').select();
        return false;
      });
      // Append inline image button to attachment.
      $button.appendTo(this);
    });
  });
};

/**
 * Attaches syntax/markup autocompletion to all textareas.
 */
Drupal.behaviors.dreditorSyntaxAutocomplete = function (context) {
  $('textarea', context).once('dreditor-syntaxautocomplete', function () {
    new Drupal.dreditor.syntaxAutocomplete(this);
  });
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

  this.$element.bind('keypress.syntaxAutocomplete', { syntax: this }, this.keypressHandler);
  this.$element.bind('keyup.syntaxAutocomplete', { syntax: this }, this.keyupHandler);
};

/**
 * Responds to any keypress event in the bound element to prevent the browser's default keyboard shortcut.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.keypressHandler = function (event) {
  var self = event.data.syntax;
  // event.which is 0 in the keypress event, so directly compare with keyCode.
  if (event.keyCode == self.keyCode) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
};

/**
 * Responds to any keyUp event in the bound element.
 */
Drupal.dreditor.syntaxAutocomplete.prototype.keyupHandler = function (event) {
  // Don't interfere with text selections.
  if (this.selectionStart != this.selectionEnd) {
    return;
  }
  // Always skip this, if a special key (except CTRL) was pressed.
  if (event.shiftKey || event.altKey) {
    return;
  }
  var self = event.data.syntax, pos = this.selectionEnd;
  // Retrieve the needle: The word before the cursor.
  var needle = this.value.substring(0, pos).match(/[^\s]+$/);
  // If there is a needle, check whether to show a suggestion.
  // @todo Revamp the entire following conditional code to call
  //   delSuggestion() only once.
  if (needle) {
    self.needle = needle[0];
    // If the needle is found in the haystack of suggestions, show a suggestion.
    if (self.suggestions[self.needle]) {
      self.setSuggestion(self.suggestions[self.needle]);
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
  // If the special autocompletion key combination was pressed and there is a
  // suggestion, perform the text replacement.
  if (event.which == self.keyCode && self.suggestion) {
    var prefix = this.value.substring(0, pos - self.needle.length);
    var suffix = this.value.substring(pos);
    this.value = prefix + self.suggestion.replace('^', '') + suffix;

    // Move the cursor to the autocomplete position marker.
    var newpos = pos - self.needle.length + self.suggestion.indexOf('^');
    this.setSelectionRange(newpos, newpos);

    // Remove the tooltip and suggestion directly after executing the
    // autocompletion.
    self.delSuggestion();

    // Do not trigger the browser's default keyboard shortcut.
    return false;
  }
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

/**
 *
 */
Drupal.dreditor.syntaxAutocomplete.prototype.suggestions = {
  '<?': "<?php\n^\n?>\n",
  '<a': '<a href="^"></a>',
  '<block': '<blockquote>^</blockquote>',
  '<code': '<code>^</code>',
  '<dl': "<dl>\n^\n</dl>\n",
  '<dt': '<dt>^</dt>',
  '<dd': '<dd>^</dd>',
  '<em': '<em>^</em>',
  '<li': '<li>^</li>',
  '<ol': "<ol>\n^\n</ol>\n",
  '<pre': "<pre>\n^\n</pre>\n",
  '<strong': '<strong>^</strong>',
  '<ul': "<ul>\n^\n</ul>\n"
};

/**
 * @} End of "defgroup dreditor_syntaxautocomplete".
 */

/**
 * Attach issue count to project issue tables and hide fixed/needs more info issues without update marker.
 */
Drupal.behaviors.dreditorIssueCount = function (context) {
  $('table.project-issue', context).once('dreditor-issuecount', function () {
    var $table = $(this);
    var count = $table.find('tbody tr').length;
    var countSuffix = ($table.parent().parent().find('.pager').length ? '+' : '');
    var countHidden = 0;

    var $container = $('<div class="dreditor-issuecount"></div>');
    $table.before($container);

    // Add link to toggle this feature.
    // @todo Initial draft. Needs refactoring into abstracted configuration.
    var enabled = Drupal.dreditor.conf['application.issuecount.status'];
    $('<a href="#" class="dreditor-application-toggle"></a>')
      .text(enabled ? 'Show all issues' : 'Hide irrelevant issues')
      .click(function () {
        Drupal.dreditor.conf['application.issuecount.status'] = (!enabled);
        // Reload the current page without refresh from server.
        window.location.href = window.location.href;
        return false;
      })
      .prependTo($container);

    if (enabled) {
      countHidden = $table.find('tr.state-2, tr.state-16').not(':has(.marker)').addClass('dreditor-issue-hidden').hide().length;
    }

    // Output total count (minus hidden).
    $container.append('<span class="dreditor-issuecount-total">Displaying <span class="count">' + (count - countHidden) + '</span>' + countSuffix + ' issues.</span>');
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
};

/**
 * Prepopulate issue creation form with last used values.
 */
Drupal.behaviors.dreditorIssueValues = function (context) {
  // This catches only the issue creation form, since project issue/release data
  // cannot be altered on node/#/edit.
  $('#node-form:has(#edit-rid)', context).once('dreditor-issuevalues', function () {
    var $form = $(this);
    if (Drupal.dreditor.conf.issueValues) {
      $.each(Drupal.dreditor.unserialize(Drupal.dreditor.conf.issueValues), function (name, value) {
        $form.find(':input[name=' + name + ']').val(value);
      });
    }
    $form.submit(function () {
      Drupal.dreditor.conf.issueValues = $.param($('.inline-options:first :input', $form));
    });
  });
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
Drupal.behaviors.dreditorIssuesFilterFormValuesClean = function (context) {
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
};

/**
 * Add a 'Reset' button to project issue exposed views filter form.
 */
Drupal.behaviors.dreditorIssuesFilterFormReset = function (context) {
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
};

/**
 * Initialize Dreditor/Greasemonkey global configuration handler.
 *
 * @see Drupal.dreditor.confInit()
 *
 * @todo Dreditor's Drupal behaviors are not always invoked with drupal.org's
 *   behaviors. Starting with a recent GM update, confInit() had to be moved
 *   outside of .ready(), since Dreditor's behaviors were suddenly invoked with
 *   drupal.org's behaviors, i.e., this might depend on browser/GM version.
 */
Drupal.dreditor.conf = GM_getValue('dreditor.conf', '');
Drupal.dreditor.confInit();
jQuery(document).ready(function () {
  Drupal.attachBehaviors(this);
});

// GM_setValue() is only allowed in the user script context.
window.addEventListener('unload', function () {
  GM_setValue('dreditor.conf', $.param(Drupal.dreditor.conf));
}, true);

// Add custom stylesheet.
// @todo Can we load CSS files that ship with this user script?
GM_addStyle(" \
#dreditor-wrapper { position: fixed; z-index: 1000; width: 100%; top: 0; } \
#dreditor { position: relative; width: 100%; height: 100%; background-color: #fff; border: 1px solid #ccc; } \
#dreditor #bar, #dreditor-actions { width: 230px; padding: 0 10px; font: 10px/18px sans-serif, verdana, tahoma, arial; } \
#dreditor #bar { position: absolute; height: 100%; } \
#dreditor-actions { background-color: #fff; bottom: 0; padding-top: 5px; padding-bottom: 5px; position: absolute; } \
.dreditor-button, #content a.dreditor-button { background: transparent url(/sites/all/themes/bluecheese/images/sprites-horizontal.png) repeat-x 0 -1150px; border: 1px solid #28d; color: #fff; cursor: pointer; font-size: 11px; font-family: sans-serif, verdana, tahoma, arial; font-weight: bold; padding: 0.1em 0.8em; text-transform: uppercase; text-decoration: none; -moz-border-radius: 7px; -webkit-border-radius: 7px; border-radius: 7px; } \
.dreditor-button:hover, #content a.dreditor-button:hover { background-position: 0 -1100px; } \
.dreditor-button { margin: 0 0.5em 0 0; } \
table .dreditor-button { margin-left: 1em; } \
#dreditor #menu { margin: 0; max-height: 30%; overflow-y: scroll; padding: 0; } \
#dreditor #menu li { list-style: none; margin: 0; overflow: hidden; padding: 0 0.5em 0 0; white-space: nowrap; } \
#dreditor #menu li li { padding: 0 0 0 1em; } \
#dreditor #menu > li > a { display: block; padding: 0 0 0 0.2em; background-color: #f0f0f0; } \
#dreditor a { text-decoration: none; } \
#dreditor .form-textarea { width: 100%; height: 12em; font: 13px 'courier new', courier, 'lucida console'; color: #000; } \
#dreditor-content { margin-left: 250px; border-left: 1px solid #ccc; overflow: scroll; height: 100%; } \
#dreditor-content, pre { font: 13px 'courier new', courier, 'lucida console'; } \
#dreditor #code-delimiter { position: fixed; height: 100%; width: 0.5em; margin-left: 50.7em; background-color: #f9f9fa; } \
#dreditor #code { position: relative; padding-left: 10px; } \
#dreditor #code pre { background-color: transparent; border: 0; margin: 0; padding: 0; } \
#dreditor #code pre span { display: inline-block; margin-left: 1px; width: 2px; height: 7px; background-color: #ddd; } \
#dreditor #code pre span.error { background-color: #f99; line-height: 100%; width: auto; height: auto; border: 0; } \
#dreditor #code pre span.error.eof { color: #fff; background-color: #f66; } \
#dreditor #code pre span.error.tab { background-color: #fdd; } \
#dreditor #code pre span.hidden { display: none; } \
#dreditor #code .file { color: #088; } \
#dreditor #code .old { color: #c00; } \
#dreditor #code .new { color: #00c; } \
#dreditor #code .comment { color: #070; } \
#dreditor #code .has-comment { background-color: rgba(255, 200, 200, 0.5); } \
#dreditor #code .selected { background-color: rgba(255, 255, 200, 0.5); } \
.element-invisible { height: 0; overflow: hidden; position: absolute; } \
#dreditor-overlay { } \
 \
.dreditor-actions { overflow: hidden; position: relative; } \
a.dreditor-application-toggle { display: inline-block; padding: 0.05em 0.3em; line-height: 150%; border: 1px solid #ccc; background-color: #fafcfe; font-weight: normal; text-decoration: none; } \
#content a.dreditor-application-toggle { float: right; margin: 0 0 0 0.5em; } \
.dreditor-input { border: 1px solid #ccc; padding: 0.2em 0.3em; font-size: 100%; line-height: 150%; } \
 \
div.dreditor-issuecount { line-height: 200%; } \
.dreditor-issuecount a { padding: 0 0.3em; } \
 \
#content .fieldset-flat { display: block; border: 0; width: auto; padding: 0; } \
.fieldset-flat > legend { display: none; } \
#dreditor-issue-data #edit-title-wrapper { margin-top: 0; } \
#dreditor-issue-data .inline-options .form-item { margin-bottom: 0.3em; } \
 \
.dreditor-tooltip { display: none; position: fixed; bottom: 0; background-color: #ffffbf; border: 1px solid #000; padding: 0 3px; font-family: sans-serif; font-size: 11px; line-height: 150%; } \
");

/**
 * Check for new Dreditor versions.
 *
 * GM functions can be invoked from GM environment only.
 */
dreditorUpdateCheck = function () {
  if (typeof GM_xmlhttpRequest != 'function') {
    return;
  }
  var version = GM_getValue('version', '');
  var lastChecked = GM_getValue('update.last', 0);
  var now = parseInt(new Date() / 1000, 10);
  // Check every 3 days.
  var interval = 60 * 60 * 24 * 3;
  if (lastChecked - now < -interval) {
    // Whatever happens to this request, remember that we tried.
    GM_setValue('update.last', now);
    GM_xmlhttpRequest({
      method: 'GET',
      url: 'http://drupalcode.org/viewvc/drupal/contributions/modules/dreditor/CHANGELOG.txt?view=co',
      onload: function (responseDetails) {
        if (responseDetails.status == 200) {
          var newversion = responseDetails.responseText.match(/\$Id.+\$/)[0];
          if (newversion == version) {
            return;
          }
          var doUpdate = window.confirm('A new version of Dreditor is available. Shall we visit the project page to update?');
          if (doUpdate) {
            window.open('http://drupal.org/project/dreditor', 'dreditor');
            // Let's just assume that we DID update. ;)
            GM_setValue('version', newversion);
          }
        }
      }
    });
  }
};

dreditorUpdateCheck();

