/**
 * Suggest a filename for patches to upload in an issue.
 *
 * Developed in issue: http://drupal.org/node/1294662
 */
Drupal.behaviors.dreditorPatchNameSuggestion = {
  attach: function (context) {
    // Attach this behavior only to project_issue nodes. Use a fast selector for
    // the common case, but also support comment/reply/% pages.
    if (!($('body.node-type-project-issue', context).length || $('div.project-issue', context).length)) {
      return;
    }

    $('#comment-form #edit-upload-wrapper, #node-form #edit-upload-wrapper', context).once('dreditor-patchsuggestion', function () {
      var $container = $('#edit-upload-wrapper > label');
      var $link = $('<a class="dreditor-application-toggle dreditor-patchsuggestion" href="#">Patchname suggestion</a>');
      $link.prependTo($container);
      $link.click(function() {
        var title = Drupal.dreditor.issue.getIssueTitle() || 'title';
        title = title.replace(/[^a-zA-Z0-9]+/g, '_');
        // Truncate and remove a heading/trailing undescore.
        title = title.substr(0, 60);
        title = title.replace(/(^_|_$)/, '');

        var nid = Drupal.dreditor.issue.getNid() || 0;
        var project = Drupal.dreditor.issue.getProjectShortName() || 'unknownProject';
        var component = Drupal.dreditor.issue.getSelectedComponent() || 'component';
        component = component.replace(/[^a-zA-Z0-9]+/, '-').toLowerCase();

        var core = Drupal.dreditor.issue.getSelectedVersionCore() || '';
        core = core.substring(0, 1);

        // Build filename suggestion.
        var patchName = '';
        if (project === 'drupal') {
          patchName = project + core + '-' + component;
        }
        else {
          patchName = project + '-' + component;
        }

        if (nid !== 0) {
          var newCommentNumber = Drupal.dreditor.issue.getNewCommentNumber();

          patchName += '-' + nid + '-' + newCommentNumber;
        }

        patchName += '.patch';

        window.prompt("Please use this value", patchName);
        return false;
      });
    });
  }
};
