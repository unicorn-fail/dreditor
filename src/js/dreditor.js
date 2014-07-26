Drupal.dreditor = {
  version: '%PKG.VERSION%',
  behaviors: {},
  setup: function () {
    var self = this;

    // Reset scroll position.
    delete self.scrollTop;

    // Prevent repeated setup (not supported yet).
    if (self.$dreditor) {
      self.show();
      return;
    }
    // Setup Dreditor overlay.
    self.$wrapper = $('<div id="dreditor-wrapper"></div>').css({ height: 0 });
    // Add Dreditor content area.
    self.$dreditor = $('<div id="dreditor"></div>').appendTo(self.$wrapper);
    self.$wrapper.appendTo('body');

    // Setup Dreditor context.
    Drupal.dreditor.context = self.$dreditor.get(0);

    // Add sidebar.
    var $bar = $('<div id="bar"><div class="resizer"></div></div>').prependTo(self.$dreditor);
    // Add ul#menu to sidebar by default for convenience.
    $('<h3>Diff outline</h3>').appendTo($bar);
    $('<ul id="menu"></ul>').appendTo($bar);

    // Allow bar to be resizable.
    self.resizable($bar);

    // Add the content region.
    $('<div id="dreditor-content"></div>').appendTo(self.$dreditor);

    // Add global Dreditor buttons container.
    var $actions = $('<div id="dreditor-actions"></div>');
    // Add hide/show button to temporarily dismiss Dreditor.
    $('<input id="dreditor-hide" class="dreditor-button" type="button" value="Hide" />')
      .click(function () {
        if (self.visible) {
          self.hide();
        }
        else {
          self.show();
        }
      })
      .appendTo($actions);
    // Add cancel button to tear down Dreditor.
    $('<input id="dreditor-cancel" class="dreditor-button" type="button" value="Cancel" />')
      .click(function () {
        if (Drupal.dreditor.patchReview.comment.comments.length === 0 || window.confirm('Do you really want to cancel Dreditor and discard your changes?')) {
          Drupal.dreditor.tearDown();
        }
        return;
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

  resizable: function ($bar) {
    var self = this;
    var $resizer = $bar.find('.resizer');
    var minWidth = 230;
    var maxWidth = self.$dreditor.width() / 2;
    var currentWidth = Drupal.storage.load('barWidth') || minWidth;
    var resizing = false;

    // Ensure that the maximum width is calculated on window resize.
    $(window).bind('resize', function () {
      maxWidth = self.$dreditor.width() / 2;
    });

    // Limit widths to minimum and current maximum.
    var checkWidth = function (width) {
      if (width < minWidth) {
        width = minWidth;
      }
      if (width > maxWidth) {
        width = maxWidth;
      }
      return width;
    };

    // Initialize the current width of the bar.
    $bar.width(checkWidth(currentWidth));

    // Bind the trigger for actually instantiating a resize event.
    $resizer
      .bind('mousedown', function () {
        if (!resizing) {
          resizing = true;
          $resizer.addClass('resizing');
          self.$dreditor.addClass('resizing');
        }
      });

    // Bind the mouse movements to the entire $dreditor div to accommodate
    // fast mouse movements.
    self.$dreditor
      .bind('mousemove', function (e) {
        if (resizing) {
          currentWidth = checkWidth(e.clientX);
          $bar.width(currentWidth);
        }
      })
      .bind('mouseup', function () {
        if (resizing) {
          resizing = false;
          $resizer.removeClass('resizing');
          self.$dreditor.removeClass('resizing');
          Drupal.storage.save('barWidth', currentWidth);
        }
      });
  },

  tearDown: function (animate) {
    animate = typeof animate !== 'undefined' ? animate : true;
    var self = this;

    // Remove the ESC keyup event handler that was bound in self.setup().
    $(document).unbind('keyup', self.escapeKeyHandler);
    if (animate) {
      self.$wrapper.animate({ height: 0 }, 300, function(){
        $(this).hide();
        $('body').css({ overflow: 'auto' });
      });
      setTimeout(function(){
        self.$wrapper.stop(true, true).css('height', 0).remove();
        delete self.$dreditor;
        delete self.$wrapper;
      }, 500);
    }
    else {
      self.$wrapper.remove();
      delete self.$dreditor;
      delete self.$wrapper;
    }
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
    if (event.which === 27) {
      if (self.visible) {
        self.hide();
      }
      else {
        self.show();
      }
    }
  },

  attachBehaviors: function (args) {
    if (args === undefined || typeof args !== 'object') {
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
      if (classes[i].substr(0, length + 1) === prefix + '-') {
        var parts = classes[i].split('-');
        var value = parts.slice(2).join('-');
        params[parts[1]] = value;
        // Convert numeric values.
        if (parseInt(value, 10) === value) {
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
    if (!(typeof selector === 'string' && selector.length)) {
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
    else if (typeof window.console.warn !== 'undefined') {
      window.console.warn(selector + ' does not exist.');
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
    url += (typeof options.query !== 'undefined' ? options.query : window.location.search);
    // Not using current fragment by default.
    if (options.fragment.length) {
      url += options.fragment;
    }
    window.location.href = url;
    return false;
  }
};
