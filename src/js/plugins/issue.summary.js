/**
 * Issue summary AJAX editor.
 */
Drupal.behaviors.dreditorIssueSummary = {
  attach: function () {
    // Limit to project_issue node view page.
    $('#project-summary-container').once('dreditor-issue-summary', function () {
      // Clone "Edit" link after "Issue summary" title.
      var $edit_wrapper = $('<small class="admin-link"> [ <span></span> ] </small>');
      var $edit_link = $('#tabs a:contains("' + 'Edit' + '")').clone();
      $edit_wrapper.find('span').append($edit_link);
      $edit_wrapper.appendTo($(this).parent().find('h2:first'));

      var $widget = $('<div id="dreditor-widget"></div>').insertAfter(this).hide();

      $edit_link.click(function () {
        // First of all, remove this link.
        $edit_wrapper.remove();
        // Retrieve the node edit form.
        $.get(this.href, function (data) {
          var $data = $(data);
          // Do power users really need this advise? Investigate this.
          // $widget.append($data.find('div.help'));
          $widget.append($data.find('#node-form'));

          // For users with just one input format, wrap filter tips in a fieldset.
          // @todo Abstract this into a behavior. Also applies to comment form.
          $widget.find('fieldset > ul.tips')
            .wrap('<fieldset class="collapsible collapsed"></fieldset>')
            .before('<legend>Input format</legend>');
          // Clean up.
          // Remove messages; contains needless info.
          $widget.find('div.messages.status').remove();
          // That info about issue fields in .standard .standard thingy, too.
          $widget.find('div.node-form > div.standard > div.standard').remove();
          // Hide node admin fieldsets; removing these would result in nodes being
          // unpublished and author being changed to Anonymous on submit.
          $widget.find('div.admin').hide();

          // Flatten issue summary, input format, and revision info fielsets.
          // Blatantly remove all other fieldsets. :)
          $widget.find('fieldset')
            .not(':has(#edit-body, .tips)')
            .removeClass('collapsible').hide();
          // Visually remove top-level fieldsets, except text format.
          $widget.find('fieldset:has(#edit-body)')
            .removeClass('collapsible').addClass('fieldset-flat');
          // Remove needless spacing between summary and revision elements.
          $widget.find('.fieldset-flat:eq(0)').css('marginBottom', 0);

          // Remove "Preview changes" and "Delete" buttons.
          $widget.find('#edit-preview-changes').remove();
          $widget.find('#edit-delete').remove();
          // Sorry, no support for "Preview" yet.
          $widget.find('#edit-preview').remove();

          // Add a Cancel button. Move it far away from the submit button. ;)
          $widget.find('#edit-submit').before(
            $('<a href="javascript:void(0);" class="dreditor-button right">Cancel</a>').click(function () {
              $widget.slideUp('fast', function () {
                $widget.remove();
              });
              return false;
            })
          );

          // Lastly, attach behaviors and slide in.
          Drupal.attachBehaviors($widget.get(0));
          $widget.slideDown();
        }, 'html');
        return false;
      });
    });
  }
};
