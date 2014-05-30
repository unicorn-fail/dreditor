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
    var self = this;
    // Comment body textarea form item.
    $(context).find('form .form-item-nodechanges-comment-body-value').once('dreditor-form-sticky', function () {
      self.addButton($(this).find('.form-textarea-wrapper'));
    });
    // Issue summary body form item.
    // Use the entire form item for the issue summary, so as to include the
    // issue summary template button.
    $(context).find('#project-issue-node-form .form-item-body-und-0-value').once('dreditor-form-sticky', function () {
      self.addButton($(this));
    });
  },

  addButton: function ($wrapper) {
    if ($wrapper.attr('id')) {
      return;
    }
    var $toggle = $('<a href="#" class="dreditor-application-toggle">Make sticky</a>');
    $toggle.bind('click', function (e) {
      e.preventDefault();
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
};
