/**
 * Allows to make a form widget sticky.
 *
 * On an issue with many follow-ups, one needs to jump back and forth between
 * the comment form and individual earlier comments you want to reply to.
 *
 * To prevent that, allow to make a form widget sticky, so the user is able to
 * read, scroll, and comment at the same time.
 */
Drupal.behaviors.dreditorFormSticky = {
  attach: function (context) {
    function addButton($wrapper) {
      if ($wrapper.attr('id')) {
        return;
      }
      var $toggle = $('<a href="javascript:void(0);" class="dreditor-application-toggle">Make sticky</a>');
      $toggle.click(function () {
        if ($wrapper.attr('id') === 'dreditor-widget') {
          $wrapper.removeAttr('id');
          $toggle.removeClass('sticky-cancel active').text('Make sticky');
        }
        else if (!$wrapper.attr('id') && !$('#dreditor-widget').length) {
          $wrapper.attr('id', 'dreditor-widget');
          $toggle.addClass('sticky-cancel active').text('Unstick');
        }
      });
      $wrapper.prepend($toggle);
    }
    // Full issue update form.
    $(context).find('#project-issue-node-form > div').once('dreditor-form-sticky', function () {
      addButton($(this));
    });
    // Comment form textarea.
    $(context).find('[class*="comment-body"]').once('dreditor-form-sticky', function () {
      addButton($(this).find('.form-textarea-wrapper'));
    });
    // Issue summary.
    // Use the entire form item for the issue summary, so as to include the
    // issue summary template button.
    $(context).find('#project-issue-node-form #edit-body [class*="form-item-body"]:first').once('dreditor-form-sticky', function () {
      addButton($(this));
    });
  }
};
