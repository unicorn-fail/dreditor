/**
 * Adds a button to insert the issue summary template.
 */
Drupal.behaviors.dreditorIssueSummaryTemplate = {
  attach: function () {
    var self = this;
    $('body.logged-in.page-node form.node-project_issue-form textarea[name="body[und][0][value]"]').once('dreditorIssueTemplate', function () {
      var $textarea = $(this);
      var $label = $('label[for*="edit-body-und-0-value"]');

      // Add a link to issue summary instructions.
      $('<small><a href="/issue-summaries" target="_blank" class="admin-link">instructions</a></small>')
        .appendTo($label);

      // Add a button to insert issue summary template.
      $('<a href="#" class="dreditor-button" style="margin-left: 10px;">Insert template</a>')
        .appendTo($label)
        .bind('click', function (e) {
          e.preventDefault();
          self.insertSummaryTemplate($textarea);
        });

      // Add a button to insert novice tasks.
      $('<a href="#" class="dreditor-button" style="margin-left: 10px;">Insert novice tasks</a>')
        .appendTo($label)
        .bind('click', function (e) {
          e.preventDefault();
          self.insertNoviceTasks($textarea);
        });
    });
  },
  insertSummaryTemplate: function ($textarea) {
    $.get('/node/1326662', function (data) {
      // Retrieve the template.
      var $template = $('<div/>').html($(data).find('#node-1326662 code').text());

      // On node/add, remove the "Original report by" section.
      if (location.href.search('node/add') !== -1) {
        $template.find('#summary-original-report').remove();
      }
      // On node view, simply replace @username with the existing link to the
      // original author.
      else if (!location.href.match(/^.*node\/[^\/]*\/edit/)) {
        var $profileLink = $('.node .submitted a.username').clone();
        if ($profileLink.length) {
          $profileLink.text('@' + $profileLink.text());
        }
        else {
          $profileLink = $('<a/>').text('Anonymous').attr('href', '#');
        }
        $template.find('#summary-original-report a').replaceWith($('<div/>').html($profileLink).html());
      }
      // On node edit, the node author is only visible for privileged users.
      // Retrieve the author from the issue's JSON data.
      // @todo Update when JSON data is available, or find a better solution.
//      else {
//        var nodePath = location.href.match(/^.*node\/[0-9]*/);
//        if (nodePath) {
//          $.getJSON(nodePath[0] + '/project-issue/json', function (json) {
//            var $profileLink;
//            var $bodyVal = $('<div/>').html($textarea.val());
//            if (!json.authorId || !json.authorName || !json.authorUrl) {
//              $profileLink = $('<a/>').text('Anonymous').attr('href', '#');
//            }
//            else {
//              $profileLink = $('<a/>').text('@' + json.authorName).attr('href', json.authorUrl);
//            }
//            $bodyVal.find('#summary-original-report a').replaceWith($('<div/>').html($profileLink).html());
//            $textarea.val($bodyVal.html());
//          });
//        }
//      }

      var template = $template.html()
        .replace(/<\/em>/g, "</em>\n\n")
        .replace(/<\/h3>/g, "</h3>\n\n");

      // Prepend template to current body.
      $textarea.val(template + $textarea.val());
    });
  },
  insertNoviceTasks: function ($textarea) {
    $.get('/node/2272209', function (data) {
      // Retrieve the template.
      var $template = $('<div/>').html($(data).find('#node-2272209 code').text());

      // Add missing newlines.
      var template = $template.html()
        .replace(/-->/g, "-->\n\n")
        .replace(/<ul>/g, "<ul>\n\n")
        // Only adjust the first list item.
        .replace(/<\/li>/, "</li>\n\n");

      // Insert the template at the cursor if possible.
      var pos = $textarea[0].selectionStart;
      var bodyValue = $textarea.val();
      $textarea.val(bodyValue.substring(0, pos) + template + bodyValue.substring(pos));
    });
  }
};
