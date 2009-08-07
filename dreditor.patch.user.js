// ==UserScript==
// @name           Dreditor: Patch review
// @namespace      http://drupal.org/project/dreditor
// @description    Highlights and outlines diff syntax in patch files.
// @author         Daniel F. Kudwien (sun)
// @version        0.1
// @include        http://drupal.org/node/*
// ==/UserScript==

// Initialize window objects.
$ = window.$ = window.jQuery = unsafeWindow.jQuery;
Drupal = window.Drupal = unsafeWindow.Drupal;
// Bail out in (the unlikely) case that JS has been disabled.
if (Drupal === undefined) {
  alert('JavaScript is disabled, but required for Dreditor.');
  return false;
}

Drupal.dreditor = Drupal.dreditor || { behaviors: {} };

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

Drupal.dreditor.setup = function (context) {
  // Setup Dreditor overlay.
  var $wrapper = $('<div id="dreditor-wrapper"></div>').css({ height: 0 });
  // Add Dreditor content area.
  var $dreditor = $('<div id="dreditor"></div>').appendTo($wrapper);
  $wrapper.appendTo('body');

  // Setup Dreditor context.
  Drupal.dreditor.context = $dreditor.get(0);

  // Add sidebar.
  var $bar = $('<div id="bar"></div>').prependTo($dreditor);
  // Add ul#menu to sidebar by default for convenience.
  $('<ul id="menu"></ul>').appendTo($bar);

  // Add content region.
  $('<div id="dreditor-content"></div>').appendTo($dreditor);

  // Add global Dreditor buttons container.
  var $actions = $('<div id="dreditor-actions"></div>');
  // Add hide/show button to temporarily dismiss Dreditor.
  $('<input id="dreditor-hide" class="dreditor-button" type="button" value="Hide" />')
    .toggle(
      function () {
        var button = this;
        $wrapper.animate({ height: 34 }, function () {
          button.value = 'Show';
          $('body', context).css({ overflow: 'auto' });
        });
        return false;
      },
      function () {
        var button = this;
        $('body', context).css({ overflow: 'hidden' });
        $wrapper.animate({ height: '100%' }, function () {
          button.value = 'Hide';
        });
        return false;
      }
    )
    .appendTo($actions);
  // Add cancel button to tear down Dreditor.
  $('<input id="dreditor-cancel" class="dreditor-button" type="button" value="Cancel" />')
    .click(function () {
      return Drupal.dreditor.tearDown(context);
    })
    .appendTo($actions);
  $actions.appendTo($bar);

  // Setup application.
  var args = arguments;
  // Cut out the application name (2nd argument).
  this.application = Array.prototype.splice.call(args, 1, 1)[0];
  // Remove global window context; new context is added by attachBehaviors().
  args = Array.prototype.slice.call(args, 1);
  this.attachBehaviors(args);

  // Display Dreditor.
  $('body', context).css({ overflow: 'hidden' });
  $wrapper.animate({ height: '100%' });
};

Drupal.dreditor.tearDown = function (context) {
  $('#dreditor-wrapper', context).animate({ height: 0 }, function () {
    $('body', context).css({ overflow: 'auto' });
    $(this).remove();
  });
  return false;
};

Drupal.dreditor.attachBehaviors = function (args) {
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
};

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
Drupal.dreditor.getParams = function(element, prefix) {
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
      if (this.href.indexOf('.patch') == -1) {
        return;
      }
      // Generate review link.
      var $link = $('<a id="dreditor-patchreview" class="dreditor-button" href="' + this.href + '">review</a>').click(function () {
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
   * Internal use only; return empty data.
   */
  _empty: {
    elements: []
  },

  /**
   * Current selection jQuery DOM element stack.
   */
  data: {
    elements: []
  },

  reset: function () {
    // Reset currently stored selection data.
    $(this.data.elements).removeClass('selected');
    this.data = $.extend({}, this._empty);
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
        if ($.trim(value)) {
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

  paste: function () {
    var html = '';
    $.each(this.comment.comments, function () {
      var $elements = $(this.elements);
      html += '<code>\n';
      // Add file information.
      var lastfile = $elements.eq(0).prevAll('.file:has(a.file)').get(0);
      if (lastfile) {
        html += lastfile.textContent + '\n';
      }
      // Add hunk information.
      var lasthunk = $elements.eq(0).prevAll('.file').get(0);
      if (lasthunk) {
        html += lasthunk.textContent + '\n';
      }

      var lastline = $elements.get(0).previousSibling;

      $elements.each(function () {
        var $element = $(this);
        // Add new last file, in case a comment spans over multiple files.
        if (lastfile != $element.prevAll('.file:has(a.file)').get(0)) {
          lastfile = $element.prevAll('.file:has(a.file)').get(0);
          html += lastfile.textContent + '\n';
        }
        // Add new last hunk, in case a comment spans over multiple hunks.
        if (lasthunk != $element.prevAll('.file').get(0)) {
          lasthunk = $element.prevAll('.file').get(0);
          html += lasthunk.textContent + '\n';
        }
        // Add a delimiter, in case a comment spans over multiple selections.
        else if (lastline != $element.get(0).previousSibling) {
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
    html += '\n\n<em>This review is powered by <a href="http://drupal.org/project/dreditor">Dreditor</a>.</em>\n';
    // Paste comment into issue comment textarea.
    var $commentField = $('#edit-comment');
    $commentField.val($commentField.val() + html);
    // Jump to the issue comment textarea after pasting.
    window.location.hash = '#edit-comment';
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
      // Mark new comments, if there are any.
      $(this.comments[data.id].elements).addClass('new-comment');
    }
    else {
      this.comments.push(data);
      var newid = this.comments.length - 1;
      this.comments[newid].id = data.id = newid;
      $(this.comments[data.id].elements).addClass('new-comment');
    }
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
      $lastFile = $('<li><a href="#' + match2 + '">' + match2 + '</a></li>');
      $menu.append($lastFile);
      return match1 + '<a class="file" id="' + match2 + '">' + match2 + '</a>' + match3;
    });
    // Build hunk menu links for file.
    line = line.replace(/^(@@ .+ @@\s+)([^\s]+\s[^\s\(]*)/, function (full, match1, match2) {
      $lastFile.append('<li><a href="#' + match2 + '">' + match2 + '</a></li>');
      return match1 + '<a class="hunk" id="' + match2 + '">' + match2 + '</a>';
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

jQuery(document).ready(function () {
  // @todo Behaviors of this user script are not invoked with regular behaviors.
  Drupal.attachBehaviors(this);
});

// Add custom stylesheet.
GM_addStyle(" \
#dreditor-wrapper { position: fixed; z-index: 1000; width: 100%; top: 0; } \
#dreditor { position: relative; width: 100%; height: 100%; background-color: #fff; border: 1px solid #ccc; } \
#dreditor #bar { position: absolute; width: 230px; height: 100%; padding: 0 10px; font: 10px/18px sans-serif, verdana, tahoma, arial; } \
.dreditor-button, #content a.dreditor-button { background: transparent url(/sites/all/themes/bluebeach/header-back.png) repeat-x 0 -30px; border: 1px solid #06c; color: #fff; cursor: pointer; font: 11px sans-serif, verdana, tahoma, arial; font-weight: bold; padding: 1px 9px; text-transform: uppercase; text-decoration: none; -moz-border-radius: 9px; -webkit-border-radius: 9px; border-radius: 9px; } \
.dreditor-button:hover, #content a.dreditor-button:hover { background-position: 0 0; } \
#dreditor .dreditor-button { margin: 0 0.5em 0 0; } \
.dreditor-patchreview-processed .dreditor-button { margin-left: 1em; } \
#dreditor-actions { background-color: #fff; position: absolute; bottom: 8px; } \
#dreditor #menu { margin: 0; max-height: 30%; overflow-y: scroll; padding: 0; } \
#dreditor #menu li { list-style: none; margin: 0; overflow: hidden; padding: 0 10px 0; white-space: nowrap; } \
#dreditor #menu li li { padding-right: 0; } \
#dreditor a { text-decoration: none; } \
#dreditor .form-textarea { width: 100%; height: 12em; font: 13px 'courier new', courier, 'lucida console'; color: #000; } \
#dreditor-content { margin-left: 250px; border-left: 1px solid #ccc; padding-left: 10px; overflow: scroll; height: 100%; } \
#dreditor-content, pre { font: 13px 'courier new', courier, 'lucida console'; } \
#dreditor #code { background: transparent url(/sites/all/themes/bluebeach/shade.png) repeat-y scroll 50em 0; } \
#dreditor #code pre { background-color: transparent; border: 0; margin: 0; padding: 0; } \
#dreditor #code pre span { display: inline-block; margin-left: 1px; width: 2px; height: 7px; background-color: #ddd; } \
#dreditor #code .file { color: #088; } \
#dreditor #code .new { color: #00d; } \
#dreditor #code .old { color: #d00; } \
#dreditor #code .has-comment { background-color: rgba(255, 200, 200, 0.5); } \
#dreditor #code .selected { background-color: rgba(255, 255, 200, 0.5); } \
#dreditor-overlay { } \
");
