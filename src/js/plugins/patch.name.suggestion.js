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

    $('#project-issue-ajax-form .field-name-field-issue-files .form-type-managed-file', context).once('dreditor-patchsuggestion', function () {
      var $container = $('> label', this);
      var $link = $('<a class="dreditor-application-toggle dreditor-patchsuggestion" href="#">Patchname suggestion</a>');
      $link.prependTo($container);
      $link.click(function() {
        var patchName = '';

        function truncateString (str, n,useWordBoundary){
          var toLong = str.length>n,
          s_ = toLong ? str.substr(0,n-1) : str;
          return useWordBoundary && toLong ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
        }

        var title = truncateString(Drupal.dreditor.issue.getIssueTitle() || '', 25, true);

        // Truncate and remove a heading/trailing underscore.
        patchName += title.replace(/[^a-zA-Z0-9]+/g, '_').replace(/(^_|_$)/, '').toLowerCase();

        var nid = Drupal.dreditor.issue.getNid() || 0;
        if (nid !== 0) {
          patchName += (patchName.length ? '-' : '') + nid;
        }
        patchName += '-' + Drupal.dreditor.issue.getNewCommentNumber();
        patchName += '.patch';

        window.prompt("Please use this value", patchName);
        return false;
      });
    });
  }
};
