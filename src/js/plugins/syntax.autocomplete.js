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
    .hide()
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
  if (event.keyCode === self.keyCode && self.suggestion) {
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
  if (this.selectionStart !== this.selectionEnd) {
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
  if (suggestion !== self.suggestion) {
    self.suggestion = suggestion;
    self.$suggestion.text(self.suggestion.replace('^', ''));
    self.$tooltip.show();
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
  if (matches = needle.match('^https?://(?:www.)?drupal.org/node/([0-9]+)')) {
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
    if (typeof self.suggestionUserList === 'undefined') {
      self.suggestionUserList = {};
      var seen = {};
      // Add issue author to comment authors and build the suggestion list.
      $('.comment a.username').add('.node .submitted a.username').each(function () {
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
    if (typeof self.suggestionCommentList === 'undefined') {
      self.suggestionCommentList = {
        0: 'content'
      };
      // Add issue author to comment authors and build the suggestion list.
      var n, id;
      $('.comment a.permalink').each(function () {
        n = this.text.substring(9);
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
