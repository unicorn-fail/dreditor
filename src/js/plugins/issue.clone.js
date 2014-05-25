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
          $(w.document).ready(function () {
            w.setTimeout(function () {
              var $oldform = $(context).find('#project-issue-node-form');
              var $newform = $(w.document).find('#project-issue-node-form');
              var sel, selectors = [
                '#edit-title',
                '#edit-field-issue-category-und',
                '#edit-field-issue-priority-und',
                '#edit-field-issue-status-und',
                '#edit-field-issue-version-und',
                '#edit-field-issue-component-und',
                '#edit-field-issue-assigned-und',
                '#edit-taxonomy-vocabulary-9-und',
              ];
              for (sel in selectors) {
                $newform.find(selectors[sel]).val($oldform.find(selectors[sel]).val());
              }
              sel = '#edit-body-und-0-value';
              var oldid = Drupal.dreditor.issue.getNid();
              $newform.find(sel)
                .val('Follow-up to [#' + oldid + ']\n\n' + $oldform.find(sel).val());

              sel = '#edit-field-issue-parent-und-0-target-id';
              $newform.find(sel)
                .val($oldform.find('#edit-title').val() + ' (' + oldid + ')');

              // Ensure all fieldsets are expanded.
              $newform.find('.collapsed').removeClass('collapsed');
              $newform.find('#edit-title').focus();

              // @todo .ready()/.setTimeout() doesn't work as expected here;
              //   a too small timeout causes the new window's DOM to not be
              //   initialized yet, in turn the new form is not found. Thus,
              //   using a reasonably high timeout of 3 secs to account for slow
              //   connections for now.
            }, 3000);
          });
        });
    });
  }
};
