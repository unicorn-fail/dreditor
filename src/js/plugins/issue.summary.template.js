/**
 * Adds a button to insert the issue summary template.
 */
Drupal.behaviors.dreditorIssueSummaryTemplate = {
  attach: function () {
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
                  var $profileLink, $bodyVal = $('<div/>').html($body.val()); // jshint ignore:line
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
