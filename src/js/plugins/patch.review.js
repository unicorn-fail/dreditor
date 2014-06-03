/**
 * Attach patch review editor to issue attachments.
 */
Drupal.behaviors.dreditorPatchReview = {
  attach: function (context) {
    var $context = $(context);
    // Prevent users from starting to review patches when not logged in.
    if (!$context.find('#project-issue-ajax-form').length) {
      return;
    }
    var $elements = $context.find('.file').once('dreditor-patchreview').find('> a');
    $elements.each(function () {
      if (this.href.match(/\.(patch|diff|txt)$/)) {
        // Generate review link.
        var $file = $(this).closest('tr').find('.file');
        var $link = $('<a class="dreditor-button dreditor-patchreview" href="' + this.href + '">Review</a>').click(function (e) {
          if (Drupal.dreditor.link !== this && Drupal.dreditor.$wrapper) {
            Drupal.dreditor.tearDown(false);
          }
          if (Drupal.dreditor.link === this && Drupal.dreditor.$wrapper) {
            Drupal.dreditor.show();
          }
          else {
            Drupal.dreditor.link = this;
            // Load file.
            $.get(this.href, function (content, status) {
              if (status === 'success') {
                // Invoke Dreditor.
                Drupal.dreditor.setup(context, 'patchReview', content);
              }
            });
          }
          e.preventDefault();
        });
        // Append review link to parent table cell.
        $link.prependTo($file);

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
              }).prependTo($file);
            }
          }
        }
      }
    });
  }
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
        if (this === newelement) {
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
      var newlist = [];
      $.each(self.data.elements, function () {
        if (this !== element) {
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
      self.$form.addButton((self.data.id !== undefined ? 'Update' : 'Save'), function () {
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
      self.$form.addButton('Cancel', function () {
        // Reset pastie.
        self.reset();
      });
      // Add comment delete button for existing comments.
      if (self.data.id !== undefined) {
        self.$form.addButton('Delete', function () {
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
        if (lasthunk && lasthunk !== $element.prevAll('tr.file').get(0)) {
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
        else if (lastline && lastline !== $element.get(0).previousSibling) {
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

    // Paste comment into issue comment textarea.
    var $commentField = $('#project-issue-ajax-form :input[name*="comment_body"]');
    $commentField.val($commentField.val() + html);
    // Flush posted comments.
    this.comment.comments = [];
    // Change the status to 'needs work'.
    // @todo Prevent unintended/inappropriate status changes.
    //$('#edit-sid').val(13);
    // Jump to the issue comment textarea after pasting.
    Drupal.dreditor.goto('#project-issue-ajax-form');
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
    var data;
    if (typeof id !== undefined && typeof this.comments[id] === 'object') {
      data = this.comments[id];
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
    if (data !== undefined && typeof data.comment === 'string') {
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
  var $code = $('<table id="code"></table>');
  $code.append('<thead><tr><th class="line-ruler" colspan="3"></th></tr></thead>');
  var $menu = $('#menu', context);
  var $lastFile = $('<li>Parse error</li>');

  $('<h3>Diff statistics</h3>').appendTo('#dreditor #bar');
  var $diffstat = $('<div id="diffstat"></div>').appendTo('#dreditor #bar');
  var diffstat = { files: 0, insertions: 0, deletions: 0 };

  code = code.split('\n');
  var ln1 = '';
  var ln2 = '';
  var ln1content = '';
  var ln2content = '';
  var maxGutter = 0;
  var gutter, maxln1, maxln2;
  for (var n in code) {
    var ln1o = true;
    var ln2o = true;
    var line = code[n];

    // Build file menu links.
    line = line.replace(/^(\+\+\+ )([^\s]+)(\s.*)?/, function (full, match1, match2, match3) {
      var id = match2.replace(/[^A-Za-z_-]/g, '');
      $lastFile = $('<li><a href="#' + id + '">' + match2 + '</a></li>');
      $menu.append($lastFile);
      diffstat.files++;
      return match1 + '<a class="file" id="' + id + '">' + match2 + '</a>' + (match3 ? match3 : '');
    }); // jshint ignore:line
    // Build hunk menu links for file.
    line = line.replace(/^(@@ .+ @@\s+)([^\s]+\s[^\s\(]*)/, function (full, match1, match2) {
      var id = match2.replace(/[^A-Za-z_-]/g, '');
      $lastFile.append('<li><a href="#' + id + '">' + match2 + '</a></li>');
      return match1 + '<a class="hunk" id="' + id + '">' + match2 + '</a>';
    }); // jshint ignore:line

    // parse hunk line numbers
    var line_numbers = line.match(/^@@ -([0-9]+),[0-9]+ \+([0-9]+),[0-9]+ @@/);
    if (line_numbers) {
      ln1 = line_numbers[1];
      ln2 = line_numbers[2];
    }

    var classes = [], syntax = false;
    // Colorize file diff lines.
    if (line.match(/^((index|===|RCS|new file mode|deleted file mode|similarity|rename|copy|retrieving|diff|\-\-\-\s|\-\-\s|\+\+\+\s|@@\s).*)$/i)) {
      classes.push('file');
      ln1o = false;
      ln2o = false;
      // Renames and copies are easy to miss; colorize them.
      if (line.match(/^rename from|^copy from/)) {
        classes.push('old');
      }
      else if (line.match(/^rename to|^copy to/)) {
        classes.push('new');
      }
    }
    // Colorize old code, but skip file diff lines.
    else if (line.match(/^((?!\-\-\-$|\-\-$)\-.*)$/)) {
      classes.push('old');
      diffstat.deletions++;
      syntax = true;
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
      if (ln1 && ln1o) {
        ln1++;
      }
      if (ln2 && ln2o) {
        ln2++;
      }
    }
    // Colorize comments.
    if (syntax && line.match(/^.\s*\/\/|^.\s*\/\*[\* ]|^.\s+\*|^.\s*#/)) {
      classes.push('comment');
    }

    // Wrap all lines in PREs for copy/pasting and add the 80 character ruler.
    ln1content = (ln1o ? ln1 : '');
    ln2content = (ln2o ? ln2 : '');
    classes = (classes.length ? ' class="' + classes.join(' ') + '"' : '');
    line = '<tr' + classes + '><td class="ln" data-line-number="' + ln1content + '"></td><td class="ln" data-line-number="' + ln2content + '"></td><td><span class="pre">' + line + '</span></td></tr>';

    // Calculate the longest combination of line numbers in the gutter, used
    // for determining the position of the 80 character ruler.
    gutter = ("" + ln1content + ln2content);
    if (gutter.length > maxGutter) {
      maxln1 = ln1content;
      maxln2 = ln2content;
      maxGutter = gutter.length;
    }

    // Append line to parsed code.
    $code.append(line);
  }

  // The line ruler must be displayed consistently across all browsers and OS
  // that may or may not have the same fonts (kerning). Calculate the width of
  // 81 "0" characters (80 character line plus the +/- prefix from the diff)
  // by using an array (82 items joined by "0").
  //
  // We also calculate the width of the gutter (line numbers) by using the
  // largest combination of line numbers calculated above.
  var $lineRuler = $('<table id="code"><thead><tr><th class="line-ruler" colspan="3"></th></tr></thead><tbody><tr><td class="ln ln-1" data-line-number="' + maxln1 + '"></td><td class="ln ln-2" data-line-number="' + maxln2 + '"></td><td><span class="pre">' + new Array(82).join('0') + '</span></td></tr></tbody></table>')
    .appendTo('#dreditor');
  var ln1gutter = $lineRuler.find('.ln-1').outerWidth();
  var ln2gutter = $lineRuler.find('.ln-2').outerWidth();
  var lineWidth = $lineRuler.find('.pre').width();
  // Add 10px for padding (the td that contains span.pre).
  var lineRulerOffset = ln1gutter + ln2gutter + lineWidth + 10;
  var lineRulerStyle = {};
  // Check for a reasonable value for the ruler offset.
  if (lineRulerOffset > 100) {
    lineRulerStyle = {
      'visibility': 'visible',
      'left': lineRulerOffset + 'px'
    };
  }
  $lineRuler.remove();

  // Append to body...
  $('#dreditor-content', context)
    // the parsed code.
    .append($code);

  // Set the position of the 80-character ruler.
  $('thead .line-ruler').css(lineRulerStyle);

  // Append diffstat to sidebar.
  $diffstat.html(diffstat.files + '&nbsp;files changed, ' + diffstat.insertions + '&nbsp;insertions, ' + diffstat.deletions + '&nbsp;deletions.');

  var start_row;
  $('tr', $code).mousedown(function(){
    start_row = $(this)[0];
  });

  // Colorize rows during selection.
  $('tr', $code).mouseover(function(){
    if (start_row) {
      var end_row = $(this)[0];
      var start = false;
      var end = false;
      var selection = [];
      selection.push(start_row);
      $('tr', $code).each(function(){
        if ($(this)[0] === start_row) {
          start = true;
        }
        if (start && !end) {
          selection.push($(this)[0]);
        }
        if ($(this)[0] === end_row) {
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
      var end_row = $(this)[0];
      var start = false;
      var end = false;
      var selection = [];
      selection.push(start_row);
      $('tr', $code).each(function(){
        if ($(this)[0] === start_row) {
          start = true;
        }
        if (start && !end) {
          selection.push($(this)[0]);
        }
        if ($(this)[0] === end_row) {
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
