/**
 * @defgroup macro
 * @{
 */

/**
 * Dreditor Macro support.
 *
 * A macro is just a simple construct @<fieldmame>(set-value)
 * - @status(3)
 * - @comment(some text appended)
 * - @tags(ux)
 *
 * To check for field available on a drupal form page this helps a little.
 * Run it from within firebug.
 *
 var list=[];
 $('#comment-form').find('*[@id]').each(function() {
 list.push($(this).attr('id'));
 });
 list.filter(function(elem){
 return !elem.match(/wrapper/);
 });
 list.join(" ");
 */
Drupal.dreditor.macro = {
  values: {},
  patterns: {
    // Make sure patterns match on multiple lines
    // @user_name(?)
    query: /^@(.*)\(\?\)$/m,
    // @user_name()
    get: /@([a-z_]*)?\(\)/m,
    // @oldProject() checks the current issue status
    oldGet: /@old([A-Z][a-z_]*)?\(([^\(\)]*)\)/m,
    // May contains a get: @comment(This is duplicate of @duplicate_issue())
    set: /^@([a-z_]+)\(((?:[^\(\)]+\([^\(\)]*\)+|[^\(\)])*)\)/m
  },
  /**
   *
   * Provide get/set on form field
   *
   * Each field is defined by
   * - id : this is the DOM ID on the page
   * - type : form type
   * - label : used for screen scraping when issueing ie oldStatus()
   *
   * We support the following types
   * - text : get/set uses the whole field
   * - textarea : set appends values
   * - tags : set handles comma
   */
  fields: {
    title: {
      id: "edit-title",
      type: 'text'
    },
    project_title: {
      label: 'Project:',
      id: "edit-project-info-project-title",
      type: 'text',
      hasAjax: true,
      setFocus: "edit-title"
    },
    version: {
      label: 'Version:',
      id: "edit-project-info-rid",
      type: 'select'
    },
    assigned: {
      label: 'Assigned:',
      id: "edit-project-info-assigned",
      type: 'select'
    },
    component: {
      label: 'Component:',
      id: 'edit-project-info-component',
      type: 'select'
    },
    category: {
      label: 'Category:',
      id: "edit-category",
      type: 'select'
    },
    priority: {
      label: 'Priority:',
      id: "edit-priority",
      type: 'select'
    },
    status: {
      label: 'Status:',
      id: "edit-sid",
      type: 'select'
    },
    comment: {
      id: "edit-comment-body-und-0-value",
      type: 'textarea'
    },
    tags: {
      label: 'Tags:',
      id: "edit-taxonomy-tags-9",
      type: 'tags'
    }
  },
  set: function(name, value) {
//    function select_set($f, value) {
//      // First try machine values
//      window.alert("V '" + value + "'");
//      var $option_value = $f.find('option[@value=' + value + ']');
//      if ($option_value.length > 0) {
//        $f.val($option_value.val());
//        return;
//      }
//      // Try human readable values
//      var $option_text = $f.find('option')
//              .filter(function() {
//                return this.text() === value;
//              }
//              );
//      if ($option_text.length > 0) {
//        $f.val($option_text.attr('value'));
//      }
//    }

    function tags_set($f, value) {
      var remove = false;
      if (value.indexOf("-") === 0) {
        remove = true;
        value = value.replace(/^\-/, '');
      }
      var val = $f.val();
      var values = [];
      if (val.length > 0) {
        values = val.split(/\W*,\W*/);
      }
      var position = $.inArray(value, values);
      if (position > -1) {
        if (remove) {
          values.splice(position, 1);
        }
      }
      else {
        values.push(value);
      }
      $f.val(values.join(','));
    }

    /**
     * A textarea gets new values appended
     *
     * If not empty we prepend new-lines first
     */
    function textarea_set($f, value) {
      var val = $f.val();
      if (val.length > 0) {
        $f.val(val + "\n\n" + value);
        return;
      }
      $f.val(value);
    }

    var f = Drupal.dreditor.macro.fields[name];
    if (typeof f !== 'undefined') {
      if (typeof f.readonly !== 'undefined' && f.readonly) {
        return;
      }
      var $f = jQuery('#' + f.id);
      // bail out if not defined
      if ($f.length === 0) {
        return;
      }

      // If field has ajax side effect move focus away
      if (f.hasAjax) {
        $('#' + f.setFocus).focus();
      }
      // Apply per field type
      if (f.type === 'textarea') {
        textarea_set($f, value);
      }
      else if (f.type === 'tags') {
        tags_set($f, value);
      }
      else {
        $f.val(value);
      }
      // Trigger ajax
      if (f.hasAjax) {
        $f.blur();
      }
    }
  },
  /**
   * The current issue values are presented at the top of an issue
   *
   * The values are themed into a table id=project-issue-summary-table
   *
   * Each row has two column
   * - first having the label listed above in the fields
   * - next having the current issue status value
   */
  getCurrent: function(oldName) {
    var name = oldName.replace(/^old/, '').toLowerCase();
    var f = Drupal.dreditor.macro.fields[name];
    if (typeof f !== 'undefined') {
      if (typeof f.label !== 'undefined') {
        var label = f.label;
        var value;
        var $rows = $('#project-issue-summary-table').find('tr');
        $.each($rows, function(index, row) {
          var name = $(row.cells[0]).text();
          var val = $(row.cells[1]).text();
          if (name === label) {
            value = val;
          }
        });
        return value;
      }
    }
  },
  /**
   * Get the value of the named field
   *
   * @name
   *   The registered named field
   * @readable
   *   The textual variant for select
   *
   * @return the machina value or the readable variant
   */
  get: function(name, readable) {
    function select_get($f, readable) {
      if (readable) {
        return $f.find('option[@value=' + $f.val() + ']').text();
      }
      else {
        return $f.val();
      }
    }

    if (typeof readable === 'undefined') {
      readable = true;
    }
    var f = Drupal.dreditor.macro.fields[name];
    if (typeof f !== 'undefined') {
      var $f = jQuery("#" + f.id);
      // bail out if not defined
      if ($f.length === 0) {
        return;
      }
      if (f.type === 'select') {
        return select_get($f, readable);
      }
      return $f.val();
    }
    else {
      // Try values
      return Drupal.dreditor.macro.values[name];
    }
  },
  /**
   *  Parses a string optional containing macro's
   *
   *  Examples
   *  - needs work @status(13)@tags(documentation)
   */
  parse: function(text) {
    var pattern = Drupal.dreditor.macro.patterns.get;
    var matches = text.match(pattern);
    while (matches) {
      var name = matches[1];
      text = text.replace(pattern, Drupal.dreditor.macro.get(name));
      matches = text.match(pattern);
    }
    return text;
  },
  /**
   * An array of commands are executed on by one
   *
   * Each item may contains more then one macro @id(value)
   *
   * @commands array
   *   Contains strings with macro's
   */
  execute: function(commands) {
    jQuery.each(commands, function(key, value) {
      window.console.log('Executing: ' + key + ":'" + value + "'");
      var pattern = Drupal.dreditor.macro.patterns.set;
      var matches = value.match(pattern);
      while (matches) {
        var cmd = matches[1].replace(/^\s*/, '').replace(/\s*$/, '');
        // trim value
        var val = matches[2].replace(/^\s*/m, '').replace(/\s*$/m, '');
        // consume value
        value = value.replace(pattern, '');
        if (val === '?') {
          // Implement a dialog
          var msg = '';
          var def = '';
          pattern = '';
          if (cmd === 'duplicate_issue' || cmd === 'depends_on_issue' || cmd === 'blocks_issue') {
            msg = "Please give issue #";
            pattern = '[#@]';
            def = '1125936';
          }
          else if (cmd === 'duplicate_project') {
            msg = "Please give project name";
            pattern = 'http://drupal.org/project/@';
            def = 'dreditor';
          }
          else if (cmd === 'user_link') {
            msg = "Please give user ID";
            pattern = 'http://drupal.org/user/@';
            def = '0';
          }
          else {
            msg = "We need input for " + cmd;
            pattern = '@';
            def = '';
          }
          if (msg.length) {
            var result = window.prompt(msg, def);

            result = pattern.replace('@', result);
            // Store values for later retrieval
            Drupal.dreditor.macro.values[cmd] = result;
          }
        }
        else {
          // Process getters like @duplicate_issue() first
          val = Drupal.dreditor.macro.parse(val);
          Drupal.dreditor.macro.set(matches[1], val);
        }
        matches = value.match(Drupal.dreditor.macro.patterns.set);
      }
    });
  }
};

/**
 * @} End of "defgroup macro".
 */
