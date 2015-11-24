/**
 * Attach image attachment inline HTML injector to file attachments.
 */
Drupal.behaviors.dreditorInlineImage = {
  attach: function (context) {
    var $context = $(context);

    // Collect all the textareas we care about.
    var $new_comment = $('textarea[name="nodechanges_comment[comment_body][und][0][value]"]');
    var $issue_summary = $('textarea[name="body[und][0][value]"]');
    var $textareas = $().add($new_comment).add($issue_summary);

    // Keep track of last textarea in focus.
    $textareas.bind('focus', function () {
      $textareas.data('last-focused', false);
      $(this).data('last-focused', true);
    });

    // @todo .file clashes with patchReviewer tr.file + a.file markup.
    $context.find('span.file').once('dreditor-inlineimage').find('> a').each(function () {
      var $link = $(this);

      // Remove protocol + drupal.org
      var url = $link.attr('href').replace(/^https\:\/\/(?:www\.)?drupal\.org/, '');

      // Only process image attachments.
      if (!url.match(/\.png$|\.jpg$|\.jpeg$|\.gif$/)) {
        return;
      }

      // Generate inline image button (cannot be <a>, other scripts bind links).
      var $button = $('<span class="dreditor-button dreditor-inlineimage">Embed</span>');

      // Append inline image button to attachment.
      $link.parent().prepend($button);

      // Override click event.
      $button
        .bind('click', function (e) {
          // Find the last selected.
          var $target = $textareas.filter(function () {
            return $(this).data("last-focused") == true;
          });

          if (!$target.length) {
            // Issue summary body textarea form item.
            $target = $issue_summary;
          }

          if (!$target.length) {
            // Well we tried, guess this page doesn't have the textareas we want.
            return;
          }

          // Focus comment textarea.
          $('html, body').animate({
            scrollTop: $target.offset().top
          }, 300);
          // Insert image tag to URL in comment textarea.
          $target.focus().val($target.val() + "\n<img src=\"" + url + "\" alt=\"\" />\n");
          e.preventDefault();
        });
    });
  }
};
