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

Drupal.dreditor = Drupal.dreditor || { behaviors: {} };

Drupal.dreditor.setup = function (context) {
  // Setup Dreditor overlay.
  $('<div id="dreditor-overlay"></div>').css({ opacity: 0 }).appendTo('body').animate({ opacity: 0.7 });
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

  // Add global Dreditor buttons container.
  var $actions = $('<div id="dreditor-actions"></div>');
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
  this.application = Array.prototype.splice.call(args, 1, 1);
  // Remove global window context.
  args = Array.prototype.slice.call(args, 1);
  this.attachBehaviors(args);

  // Display Dreditor.
  $('#dreditor-wrapper', context).animate({ height: '100%' });
};

Drupal.dreditor.tearDown = function (context) {
  $('#dreditor-overlay, #dreditor-wrapper', context).animate({ height: 0 }, function () {
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
    elements: $([])
  },

  /**
   * Current selection jQuery DOM element stack.
   */
  data: {
    elements: $([])
  },

  reset: function () {
    // Reset currently stored selection data.
    this.data.elements.removeClass('selected');
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
    // Do not overwrite other comment data.
    if (this.data.id !== data.id) {
      this.reset();
    }
    this.data = data;
  },

  /**
   * Add elements to current selection storage.
   */
  add: function ($elements) {
    if (!$elements.length) {
      return $elements;
    }
    // Add temporary comment editing class.
    $elements.addClass('selected');

    this.data.elements = this.data.elements.add($elements);
    return $elements;
  },

  edit: function () {
    var self = this;
    // Mark current selection/commented code as selected.
    self.data.elements.addClass('selected');

    // Add Pastie.
    if (!self.$form) {
      self.$form = Drupal.dreditor.form.create('pastie');
      // Add comment textarea.
      self.$form.append('<textarea name="comment" class="form-textarea resizable" rows="10"></textarea>');
      // Add comment save button.
      self.$form.addButton('Save', function (form, $form) {
        // Store new comment, if non-empty.
        if ($.trim(form.comment.value)) {
          self.comment.save({
            id: self.data.id,
            elements: self.data.elements,
            comment: form.comment.value
          });
        }
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
    }
    // Focus pastie.
    self.$form.find('textarea').focus();
  },

  /**
   * Return currently selected code lines as jQuery object.
   */
  getSelection: function () {
    var $elements = $([]);

    var range = window.getSelection().getRangeAt(0);
    if (!range.toString()) {
      return $elements;
    }

    // Grep selected lines.
    var next = range.startContainer;
    var last = range.endContainer;
    // If start/end containers are a text node, retrieve the parent node.
    if (range.startContainer.nodeType != 1) {
      next = next.parentNode;
    }
    if (range.endContainer.nodeType != 1) {
      last = last.parentNode;
    }
    // If full lines where selected, retrieve the line right before the end of
    // selection.
    if (range.endOffset == 0) {
      last = last.previousSibling;
    }
    while (next && next != last) {
      $elements = $elements.add(next);
      next = next.nextSibling;
    }
    $elements = $elements.add(last);
    return $elements;
  },

  paste: function () {
    var html = '';
    $.each(this.comment.comments, function () {
      html += '<code>\n';
      // Add hunk information.
      var lasthunk = this.elements.eq(0).prevAll('.file').get(0);
      html += lasthunk.textContent + '\n';

      var lastline = this.elements.get(0).previousSibling;

      this.elements.each(function () {
        var $element = $(this);
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
      this.comments[data.id].elements.addClass('new-comment');
    }
    else {
      this.comments.push(data);
      var newid = this.comments.length - 1;
      this.comments[newid].id = data.id = newid;
      this.comments[data.id].elements.addClass('new-comment');
    }
    this.comments[data.id].elements.addClass('comment-id-' + data.id).addClass('has-comment');

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
      data.elements
        .removeClass('has-comment')
        .removeClass('comment-id-' + id)
        // @todo For whatever reason, the click event is not unbound here.
        .unbind('click.patchReview');
      delete this.comments[id];
    }
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
      return match1 + '<a id="' + match2 + '">' + match2 + '</a>' + match3;
    });
    // Build hunk menu links for file.
    line = line.replace(/^(@@ .+ @@\s+)([^\s]+\s[^\s\(]*)/, function (full, match1, match2) {
      $lastFile.append('<li><a href="#' + match2 + '">' + match2 + '</a></li>');
      return match1 + '<a id="' + match2 + '">' + match2 + '</a>';
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
  $code.appendTo(context);

  // Attach pastie to any selection.
  $code.mouseup(function () {
    var $elements = Drupal.dreditor.patchReview.getSelection();
    if ($elements.length) {
      Drupal.dreditor.patchReview.add($elements);
      // Display pastie.
      Drupal.dreditor.patchReview.edit();
    }
    return false;
  });
};

Drupal.dreditor.patchReview.behaviors.attachPastie = function (context) {
  $('#code .has-comment.new-comment', context).removeClass('new-comment')
    .unbind('click.patchReview').bind('click.patchReview', function () {
      // Load data from from element attributes.
      var params = Drupal.dreditor.getParams(this, 'comment');
      // Load comment and put data into selection storage.
      if (params.id !== undefined) {
        var data = Drupal.dreditor.patchReview.comment.load(params.id);
        Drupal.dreditor.patchReview.load(data);
        // Display pastie.
        Drupal.dreditor.patchReview.edit();
      }
      return false;
    });
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
#dreditor-overlay { position: fixed; z-index: 999; width: 100%; height: 100%; top: 0; background-color: #fff; } \
#dreditor-wrapper { position: fixed; z-index: 1000; width: 100%; top: 0; } \
#dreditor { position: relative; width: 95%; height: 90%; margin: auto auto; background-color: #fff; border: 1px solid #ccc; } \
#dreditor #bar { position: absolute; width: 230px; height: 100%; padding: 0 10px; font: 10px/18px sans-serif, verdana, tahoma, arial; } \
.dreditor-button, #content a.dreditor-button { background: transparent url(/sites/all/themes/bluebeach/header-back.png) repeat-x 0 -30px; border: 1px solid #06c; color: #fff; cursor: pointer; font: 11px sans-serif, verdana, tahoma, arial; font-weight: bold; padding: 1px 9px; text-transform: uppercase; text-decoration: none; -moz-border-radius: 9px; -webkit-border-radius: 9px; border-radius: 9px; } \
.dreditor-button:hover, #content a.dreditor-button:hover { background-position: 0 0; } \
#dreditor .dreditor-button { margin: 0 0.5em 0 0; } \
.dreditor-patchreview-processed .dreditor-button { margin-left: 1em; } \
#dreditor-actions { position: absolute; bottom: 8px; } \
#dreditor #menu { margin: 0; padding: 0; } \
#dreditor #menu li { list-style: none; margin: 0; overflow: hidden; padding: 0 10px 0; white-space: nowrap; } \
#dreditor #menu li li { padding-right: 0; } \
#dreditor a { text-decoration: none; } \
#dreditor .form-textarea { width: 100%; height: 12em; font: 13px 'courier new', courier, 'lucida console'; color: #000; } \
#dreditor #code { margin-left: 250px; border-left: 1px solid #ccc; padding-left: 10px; overflow: scroll; height: 100%; background: transparent url(/sites/all/themes/bluebeach/shade.png) repeat-y 40em 0; } \
#dreditor #code pre { margin: 0; font: 13px 'courier new', courier, 'lucida console'; background-color: transparent; border: 0; padding: 0; } \
#dreditor #code pre span { display: inline-block; margin-left: 2px; width: 2px; height: 7px; background-color: #ddd; } \
#dreditor #code .file { color: #088; } \
#dreditor #code .new { color: #00d; } \
#dreditor #code .old { color: #d00; } \
#dreditor #code .has-comment { background-color: rgba(255, 200, 200, 0.5); } \
#dreditor #code .selected { background-color: rgba(255, 255, 200, 0.5); } \
");
