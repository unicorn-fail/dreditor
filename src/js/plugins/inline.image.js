/**
 * Attach image attachment inline HTML injector to file attachments.
 */
Drupal.behaviors.dreditorInlineImage = {
  attach: function (context) {
    var $context = $(context);
    // Comment body textarea form item.
    var $target = $(':input[name="nodechanges_comment[comment_body][und][0][value]"]');
    if (!$target.length) {
      // Issue summary body textarea form item.
      $target = $(':input[name="body[und][0][value]"]');
    }

    // @todo .file clashes with patchReviewer tr.file + a.file markup.
    $context.find('span.file').once('dreditor-inlineimage').find('> a').each(function () {
      var $link = $(this);

      // Remove protocol + drupal.org
      var url = $link.attr('href').replace(/^https\:\/\/(?:www\.)?drupal\.org/, '');

      // Only process image attachments.
      if (!$target.length || !url.match(/\.png$|\.jpg$|\.jpeg$|\.gif$/)) {
        return;
      }

      // Generate inline image button (cannot be <a>, other scripts bind links).
      var $button = $('<span class="dreditor-button dreditor-inlineimage">Embed</span>');

      // Append inline image button to attachment.
      $link.parent().prepend($button);

      // Override click event.
      $button
        .bind('click', function (e) {
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
