/**
 * Allow to make comment widget sticky.
 *
 * On an issue with many follow-ups, one needs to jump back and forth between
 * the comment form and individual earlier comments you want to reply to.
 *
 * To prevent that, allow to make the comment form sticky (like the ajaxified
 * issue summary widget), so the user is able to read, scroll, and comment at
 * the same time.
 */
Drupal.behaviors.dreditorIssueCommentFormSticky = {
  attach: function (context) {
    $(context).find('[class*="comment-body"] .resizable-textarea').once('dreditor-issue-comment-form-sticky', function () {
      var $wrapper = $(this);
      var $toggle = $('<a href="javascript:void(0);" class="dreditor-application-toggle">Make sticky</a>');
      $toggle.click(function () {
        if ($wrapper.attr('id')) {
          $wrapper.removeAttr('id');
          $toggle.removeClass('active').text('Make sticky');
        }
        else {
          $wrapper.attr('id', 'dreditor-widget');
          $toggle.addClass('active').text('Unstick');
        }
      });
      $wrapper.prepend($toggle);
    });
  }
};
