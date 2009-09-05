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
  alert('JavaScript is disabled, but required for Dreditor.');
  return false;
}

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
  }
};

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

// Copied from jQuery 1.3.2.
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

/**
 * Attach patch review editor to issue attachments.
 */
Drupal.behaviors.dreditorPatchReview = function (context) {
  $('#attachments:not(.dreditor-patchreview-processed), #comments table.comment-upload-attachments:not(.dreditor-patchreview-processed)', context)
    .addClass('dreditor-patchreview-processed')
    .find('a').each(function () {
      // Fix annoying URL encoding bug in Drupal core Upload module.
      var baseURL = window.location.protocol + '//' + window.location.hostname + '/files/issues/';
      this.href = baseURL + encodeURIComponent(this.href.substring(baseURL.length));
      // Skip this attachment if it is not a patch.
      if (this.href.indexOf('.patch') == -1) {
        return;
      }
      // Generate review link.
      var $link = $('<a class="dreditor-button dreditor-patchreview" href="' + this.href + '">review</a>').click(function () {
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
    });
};

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

      $elements.each(function () {
        var $element = $(this);
        // Add new last file, in case a comment spans over multiple files.
        if (lastfile && lastfile != $element.prevAll('pre.file:has(> a.file)').get(0)) {
          lastfile = $element.prevAll('pre.file:has(> a.file)').get(0);
          html += lastfile.textContent + '\n';
        }
        // Add new last hunk, in case a comment spans over multiple hunks.
        if (lasthunk && lasthunk != $element.prevAll('pre.file').get(0)) {
          lasthunk = $element.prevAll('pre.file').get(0);
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
      'This review is powered by <a href="@dreditor-url">Dreditor</a>.',
      'I\'m on crack.  <a href="@dreditor-url">Are you, too?</a>'
    ];
    // Add Drupal core specific messages.
    if ($('#edit-project-info-project-title').val() == 'Drupal') {
      var daysToCodeFreeze = parseInt((new Date(2009, 9 - 1, 7) - new Date()) / 1000 / 60 / 60 / 24, 10);
      if (daysToCodeFreeze > 0) {
        $.merge(messages, [
          '@days to code freeze.  <a href="@dreditor-url">Better review yourself.</a>',
          'Beer-o-mania starts in @days!  <a href="@dreditor-url">Don\'t drink and patch.</a>'
        ]);
      }
    }
    var message = shuffle(messages)[0];
    message = message.replace('@dreditor-url', 'http://drupal.org/project/dreditor');
    message = message.replace('@days', daysToCodeFreeze + ' days');
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

  // Convert CRLF, CR into LF.
  code = code.replace(/\r\n|\r/g, "\n");
  // Escape all HTML.
  code = code.replace(/</g, '&lt;');
  code = code.replace(/>/g, '&gt;');
  // Remove cruft: IDE comments and unversioned files.
  code = code.replace(/^\# .+\n|^\? .+\n/mg, '');

  // Setup code container.
  var $code = $('<div id="code"></div>');
  var $menu = $('#menu', context);
  var $lastFile = $('<li>Parse error</li>');

  code = code.split('\n');
  for (var n in code) {
    var line = code[n];
    // Build file menu links.
    line = line.replace(/^(\+\+\+ )([^\s]+)(\s.*)?/, function (full, match1, match2, match3) {
      var id = match2.replace(/[^A-Za-z_-]/g, '');
      $lastFile = $('<li><a href="#' + id + '">' + match2 + '</a></li>');
      $menu.append($lastFile);
      return match1 + '<a class="file" id="' + id + '">' + match2 + '</a>' + match3;
    });
    // Build hunk menu links for file.
    line = line.replace(/^(@@ .+ @@\s+)([^\s]+\s[^\s\(]*)/, function (full, match1, match2) {
      var id = match2.replace(/[^A-Za-z_-]/g, '');
      $lastFile.append('<li><a href="#' + id + '">' + match2 + '</a></li>');
      return match1 + '<a class="hunk" id="' + id + '">' + match2 + '</a>';
    });

    // Colorize file diff lines.
    if (line.match(/^((Index|===|RCS|retrieving|diff|\-\-\- |\+\+\+ |@@ ).*)$/i)) {
      line = '<pre class="file">' + line + '</pre>';
    }
    // Colorize old code, but skip file diff lines.
    else if (line.match(/^((?!\-\-\-)\-.*)$/)) {
      line = '<pre class="old">' + line + '<span /></pre>';
    }
    // Colorize new code, but skip file diff lines.
    else if (line.match(/^((?!\+\+\+)\+.*)$/)) {
      line = '<pre class="new">' + line + '<span /></pre>';
    }
    // Wrap all other lines in PREs for copy/pasting.
    else {
      line = '<pre>' + line + '<span /></pre>';
    }

    // Append line to parsed code.
    $code.append(line);
  }
  // Append parsed code to body.
  $('#dreditor-content', context).append($code);

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
  $('#menu a:not(.dreditor-jumpmenu-processed)', context).addClass('dreditor-jumpmenu-processed')
    .click(function () {
      Drupal.dreditor.goto(this.hash);
      return false;
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
 * Attach commit message generator to issue comment form.
 */
Drupal.behaviors.dreditorCommitMessage = function (context) {
  $('#edit-comment-wrapper:not(.dreditor-commitmessage-processed)', context)
    .addClass('dreditor-commitmessage-processed')
    .each(function () {
      // Generate commit message button.
      var $link = $('<a class="dreditor-button dreditor-commitmessage" href="javascript:void(0);">Create commit message</a>').click(function () {
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
          .filter(':has(.comment-upload-attachments a[href*=.patch])').find('div.author a')
          // Add original post if it contains a patch.
          .add('div.node:has(#attachments a[href*=.patch]) .info-page a')
          // Count and sort by occurrences.
          .countvalues();
        // Build list of top commenters.
        var commenters = $comments.find('div.author a')
          // Skip test bot.
          .not(':contains("System Message")')
          // Add original poster.
          .add('div.node .info-page a')
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
        var title = $('h1.title').html().replace('"', "'", 'g');
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
        // Prepend commit message to issue comment textarea.
        $('#edit-comment', context).val(message + "\n\n" + $('#edit-comment', context).val());
        return false;
      });
      // Prepend commit message button to comment form.
      $link.prependTo(this);
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
  $('#comment-upload-attachments:not(.dreditor-inlineimage-processed)', context)
    .addClass('dreditor-inlineimage-processed')
    .find('div.description').each(function () {
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
        $('#edit-comment').val($('#edit-comment').val() + "\n" + image + "\n");
        // Ensure the "Documentation" input format is enabled.
        $('#edit-format-5').select();
        return false;
      });
      // Append inline image button to attachment.
      $button.appendTo(this);
    });
};

/**
 * Attach issue count to project issue tables.
 */
Drupal.behaviors.dreditorIssueCount = function (context) {
  $('table.project-issue:not(.dreditor-issuecount-processed)', context)
    .addClass('dreditor-issuecount-processed')
    .each(function () {
      var $table = $(this);
      $table.before('<div class="dreditor-issuecount">Displaying ' + $table.find('tbody tr').length + ($table.parent().parent().find('.pager').length ? '+' : '') + ' issues.</div>');
    });
};

/**
 * Hide fixed issues without update marker.
 */
Drupal.behaviors.dreditorFixedIssues = function (context) {
  $('table.project-issue:not(.dreditor-fixedissues-processed)', context)
    .addClass('dreditor-fixedissues-processed')
    .find('tr.state-2').not(':has(.marker)').addClass('dreditor-issue-hidden').hide().end().end()
    .each(function () {
      var $table = $(this);
      if (!$table.find('.dreditor-issue-hidden').length) {
        return false;
      }
      // Build notice.
      var $message = $('<span class="dreditor-fixedissues">&nbsp;' + $table.find('.dreditor-issue-hidden').length + ' fixed issues have been hidden.&nbsp;</span>');
      // Add link to re-display hidden issues.
      $('<a href="javascript:void(0);">Unhide</a>')
        .click(function () {
          $table.find('.dreditor-issue-hidden').removeClass('dreditor-issue-hidden').show();
          $(this).parent().remove();
          return false;
        })
        .appendTo($message);
      $('div.dreditor-issuecount', context).append($message);
    });
};

/**
 * Attach issue count to project issue tables.
 */
Drupal.behaviors.dreditorIssueValues = function (context) {
  // This catches only the issue creation form, since project issue/release data
  // cannot be altered on node/#/edit.
  $('#node-form:not(.dreditor-issuevalues-processed):has(#edit-rid)', context)
    .addClass('dreditor-issuevalues-processed')
    .each(function () {
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
 * Initialize Dreditor/Greasemonkey global configuration handler.
 *
 * @see Drupal.dreditor.confInit()
 */
Drupal.dreditor.conf = GM_getValue('dreditor.conf', '');
window.addEventListener('unload', function () {
  GM_setValue('dreditor.conf', $.param(Drupal.dreditor.conf));
}, true);

// @todo Behaviors of Dreditor are not invoked with regular behaviors.
jQuery(document).ready(function () {
  Drupal.dreditor.confInit();
  Drupal.attachBehaviors(this);
});

// Add custom stylesheet.
GM_addStyle(" \
#dreditor-wrapper { position: fixed; z-index: 1000; width: 100%; top: 0; } \
#dreditor { position: relative; width: 100%; height: 100%; background-color: #fff; border: 1px solid #ccc; } \
#dreditor #bar, #dreditor-actions { width: 230px; padding: 0 10px; font: 10px/18px sans-serif, verdana, tahoma, arial; } \
#dreditor #bar { position: absolute; height: 100%; } \
#dreditor-actions { background-color: #fff; bottom: 0; padding-top: 5px; padding-bottom: 5px; position: absolute; } \
.dreditor-button, #content a.dreditor-button { background: transparent url(/sites/all/themes/bluebeach/header-back.png) repeat-x 0 -30px; border: 1px solid #06c; color: #fff; cursor: pointer; font: 11px sans-serif, verdana, tahoma, arial; font-weight: bold; padding: 1px 9px; text-transform: uppercase; text-decoration: none; -moz-border-radius: 9px; -webkit-border-radius: 9px; border-radius: 9px; } \
.dreditor-button:hover, #content a.dreditor-button:hover { background-position: 0 0; } \
#dreditor .dreditor-button { margin: 0 0.5em 0 0; } \
.dreditor-patchreview-processed .dreditor-button { margin-left: 1em; } \
#dreditor #menu { margin: 0; max-height: 30%; overflow-y: scroll; padding: 0; } \
#dreditor #menu li { list-style: none; margin: 0; overflow: hidden; padding: 0 10px 0; white-space: nowrap; } \
#dreditor #menu li li { padding-right: 0; } \
#dreditor a { text-decoration: none; } \
#dreditor .form-textarea { width: 100%; height: 12em; font: 13px 'courier new', courier, 'lucida console'; color: #000; } \
#dreditor-content { margin-left: 250px; border-left: 1px solid #ccc; overflow: scroll; height: 100%; } \
#dreditor-content, pre { font: 13px 'courier new', courier, 'lucida console'; } \
#dreditor #code { background: transparent url(/sites/all/themes/bluebeach/shade.png) repeat-y scroll 50.7em 0; padding-left: 10px; } \
#dreditor #code pre { background-color: transparent; border: 0; margin: 0; padding: 0; } \
#dreditor #code pre span { display: inline-block; margin-left: 1px; width: 2px; height: 7px; background-color: #ddd; } \
#dreditor #code .file { color: #088; } \
#dreditor #code .new { color: #00d; } \
#dreditor #code .old { color: #d00; } \
#dreditor #code .has-comment { background-color: rgba(255, 200, 200, 0.5); } \
#dreditor #code .selected { background-color: rgba(255, 255, 200, 0.5); } \
#dreditor-overlay { } \
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
  var interval = 60 * 60 * 24 * 3; // Check every 3 days.
  if (lastChecked - now < -interval) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: 'http://cvs.drupal.org/viewvc.py/drupal/contributions/modules/dreditor/CHANGELOG.txt?view=co',
      onload: function (responseDetails) {
        GM_setValue('update.last', now);
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

