/**
 * Remind users to change status of uploaded patches.
 */
Drupal.behaviors.dreditorPatchStatus = {
  attach: function (context) {
    // Attach this behavior only to project_issue nodes. Use a fast selector for
    // the common case, but also support comment/reply/% pages.
    if (!($('body.node-type-project-issue', context).length || $('div.project-issue', context).length)) {
      return;
    }

    var $context = $(context);
    $(context).find('#project-issue-node-form').once('form-status', function () {
      var $form = $(this);
      var patchRegex = /\.(patch|diff)$/;
      $form.bind('submit', function () {
        var $files = $form.find('.ajax-new-content .file > a');
        var hasNewPatchFiles = false;
        $files.each(function () {
          if (this.href.match(patchRegex)) {
            hasNewPatchFiles = true;
            // Return early, we found what we are looknig for.
            return false;
          };
        });

        // If it's not values that can trigger test bot and has files.
        var status = $('select[name="field_issue_status[und]"]').val();
        if (status != 8 && status != 14) {
          var fileName = $('input.form-file', $form).val();
          // If there are files already uploaded or about to be upload are *.patch/diff.
          if (fileName.match(patchRegex) || hasNewPatchFiles) {
            return window.confirm('Are you sure you want to continue without changing the status to needs review?')
          }
        }
      });
    });
  }
};
