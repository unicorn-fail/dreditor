/**
 * Streamline issue comment form.
 *
 * Altering of the form makes certain browsers (such as Firefox) no longer find
 * the form fields upon page refresh (i.e. effective result like
 * autocomplete="off"), so we need to work with CSS tricks.
 *
 * Moving form elements around, unwrapping them, and similar actions are not
 * supported.
 */
Drupal.behaviors.dreditorIssueCommentForm = {
  attach: function (context) {
    $('#comment-form:has(#edit-category)', context).once('dreditor-issue-comment-form', function () {
      // On comment/reply path pages, drupal.org does not apply the required
      // .node-type-project-issue to BODY, which the Bluecheese theme targets for
      // styling comments. Ensure that it is set.
      // @todo Fix upstream.
      $('body').addClass('node-type-project-issue');

      var $form = $('> div', this);
      // Remove that ugly looking heading.
      $form.parents('.content').prev('h2').remove();

      // Since we cannot move DOM elements around, we need to use advanced CSS
      // positioning to achieve a sane order of form elements.
      $form.css({ position: 'relative', paddingTop: '20em' });

      // Unwrap basic issue data.
      $form
        .find('fieldset:first')
        .css({ position: 'absolute', top: '2em', width: '100%' })
        .attr('id', 'dreditor-issue-data')
        .removeClass('collapsible').addClass('fieldset-flat')
        .find('.fieldset-wrapper')
        // Hide note about issue title for n00bs.
        .find('.description:first').hide().end();

      // Hide label for comment textarea.
      $form.find('label[for="edit-comment"]').hide();

      // Move issue tags into issue data.
      // Note: Issue tags are still reset upon page refresh, but that's caused by
      // by collapse.js in D6, which inserts div.fieldset-wrapper into the form.
      // Issue tags are a constant drama on d.o, got moved into a fieldset and
      // back out at least twice already. Ignore epic discussions and simply find
      // both.
      var $tags = $form.find('fieldset:has(.form-item[id*=tags])')
        .removeClass('collapsible collapsed').addClass('fieldset-flat');
      if (!$tags.length) {
        $tags = $form.find('.form-item[id*=tags]');
      }
      $tags
        .css({ position: 'absolute', top: '15.5em', width: '100%', margin: 0 })
        .find('label').each(function () {
          var $label = $(this).hide();
          $('#' + $label.attr('for'), context).attr('title', $label.text());
        });

      // Unwrap attachments.
      $form
        .find('.attachments fieldset')
        .removeClass('collapsible').addClass('fieldset-flat')
        .find('.description:first').hide();

      // Add expected comment #number; parse last comment, since deleted/
      // unpublished comments are counted. Also, there
      // are no comments to count on fresh issues.
      var count = $('#comments .comment:last .comment-title', context).text() || 0;
      if (count) {
        count = parseInt(count.match(/\d+$/)[0], 10);
      }
      count++;
      $('<h3 class="comment-title">#' + count + '</h3>')
        .css({ position: 'absolute', top: 11 })
        .prependTo($form);

      // Add classes to make it look licky. Needs to stay last to not break
      // comment count.
      $(this).addClass('comment');
      $form.addClass('comment-inner');
    });
  }
};

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
    $(context).find('.comment-form').once('dreditor-issue-comment-form-sticky', function () {
      var $wrapper = $(this).find('.resizable-textarea');
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
