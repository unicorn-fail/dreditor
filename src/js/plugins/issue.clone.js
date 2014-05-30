/**
 * Attach clone issue button to issues.
 */
Drupal.behaviors.dreditorIssueClone = {
  attach: function (context) {
    var _window = window;
    var $context = $(context);
    $context.find('body.node-type-project-issue:not(.page-node-edit)').once('dreditor-clone-button', function () {
      $('<li><button id="dreditor-clone-button" class="dreditor-button">Clone issue</button></li>')
        .appendTo($context.find('#tabs ul'))
        .find('button')
        .bind('click.dreditor-clone', function () {
          // Retrieve the current issue's project shortname.
          var project = /[^/]*$/.exec($('div.breadcrumb').find('a').attr('href'))[0];

          // Open a new window.
          var w = _window.open('/node/add/project-issue/' + project + '#project-issue-node-form', '_blank');
          // @todo Revisit this once Dreditor no longer depends on d.o's jQuery.
          // $(w).bind('load') does not actually bind to the new window "load"
          // event. This may be on purpose or a bug with the currently used
          // jQuery version on d.o (1.4.4).
          w.addEventListener('load', function () {
            // Retrieve the DOM of the newly created window.
            var $document = $(w.document);
            $document.ready(function () {
              var parentNid = Drupal.dreditor.issue.getNid();
              var $parentForm = $context.find('#project-issue-node-form');
              var $newForm = $document.contents().find('#project-issue-node-form');
              var selector, selectors = [
                '#edit-title',
                '#edit-body-und-0-value',
                '#edit-field-issue-category-und',
                '#edit-field-issue-priority-und',
                '#edit-field-issue-status-und',
                '#edit-field-issue-version-und',
                '#edit-field-issue-component-und',
                '#edit-field-issue-assigned-und',
                '#edit-taxonomy-vocabulary-9-und'
              ];
              for (selector in selectors) {
                $newForm.find(selectors[selector]).val($parentForm.find(selectors[selector]).val());
              }

              // Prepend body with "Follow-up to ..." line.
              var $body = $newForm.find('#edit-body-und-0-value');
              $body.val('Follow-up to [#' + parentNid + ']\n\n' + $body.val());

              // Add originating issue was parent issue relationship.
              $newForm.find('#edit-field-issue-parent-und-0-target-id')
                .val($parentForm.find('#edit-title').val() + ' (' + parentNid + ')');


              // Ensure all fieldsets are expanded.
              $newForm.find('.collapsed').removeClass('collapsed');

              // Focus on the new issue title so users can enter it.
              $newForm.find('#edit-title').focus();
            });
          }, false);
        });
    });
  }
};
