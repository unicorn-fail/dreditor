/**
 * Adds a button to insert the remaining tasks template.
 */
Drupal.behaviors.dreditorRemainingTasksTemplate = {
  attach: function () {
    // Add the template button above the issue summary field.
    $('body.logged-in.page-node form.node-project_issue-form textarea[name="body[und][0][value]"]').once('dreditorRemainingTasks', function () {
      var $body = $(this);

      // Insert this button after the issue summary template button.
      var $issueSummaryButton = $('label[for*="edit-body-und-0-value"] > a.dreditor-button--insert-issue-summary');

      // Create a button to insert the template.
      $('<a/>')
        .attr({
          class: 'dreditor-button dreditor-button--insert-remaining-tasks',
          href:  '#',
          style: 'margin-left: 10px;'
        })
        .text('Remaining tasks template')
        .insertAfter($issueSummaryButton)
        .click(function (e) {
          // Load the remaining tasks template node.
          $.get('/node/2272209', function (data) {
            // Retrieve the template HTML.
            var $template = $('<div/>').html($(data).find('#node-2272209 code').text());
            // Add missing newlines. Note that the li replacement only replaces
            // the first li.
            var templateText = $template.html().replace(/-->/g, "-->\n\n").replace(/<ul>/g, "<ul>\n\n").replace(/<\/li>/, "</li>\n\n");
            // Insert the template at the cursor if possible.
            var position = $body[0].selectionStart;
            var bodyValue = $body.val();
            $body.val(bodyValue.substring(0, position) + templateText + bodyValue.substring(position));
          });
          // Prevent default "click" event.
          e.preventDefault();
        });
    });
  }
};
