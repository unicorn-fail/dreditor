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
        .find('button').bind('click.dreditor-clone', function () {
          var project = /[^/]*$/.exec($('div.breadcrumb').find('a').attr('href'))[0];
          // Open a new window.
          var w = _window.open('/node/add/project-issue/' + project + '#project-issue-node-form', '_blank');
          $.get(_window.location.pathname + '/edit', function(content) {
            var $edit = $(content);
            $(w).ready(function () {
              setTimeout(function () {
                var $doc = $(w.document);
                $doc.find('#edit-field-issue-version-und').val($edit.find('#edit-field-issue-version-und').val());
                $doc.find('#edit-field-issue-component-und').val($edit.find('#edit-field-issue-component-und').val());
                $doc.find('#edit-field-issue-assigned-und').val($edit.find('#edit-field-issue-assigned-und').val());
                $doc.find('#edit-field-issue-category-und').val($edit.find('#edit-field-issue-category-und').val());
                $doc.find('#edit-field-issue-priority-und').val($edit.find('#edit-field-issue-priority-und').val());
                $doc.find('#edit-field-issue-status-und').val($edit.find('#edit-field-issue-status-und').val());
                $doc.find('#edit-taxonomy-vocabulary-9-und').val($edit.find('#edit-taxonomy-vocabulary-9-und').val());
                $doc.find('.node-form .collapsed').removeClass('collapsed');
                $doc.find('#edit-body-und-0-value').val('Follow-up from [#' + Drupal.dreditor.issue.getNid() + '].\n\n');
                $doc.find('#edit-title').focus();
              }, 10);
            });
          });
        });
    });
  }
};
