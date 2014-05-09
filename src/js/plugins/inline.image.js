/**
 * Attach image attachment inline HTML injector to file attachments.
 */
Drupal.behaviors.dreditorInlineImage = {
  attach: function (context) {
    var
      $context = $(context),
      $comment = $(':input[name="nodechanges_comment_body[value]"]'),
      $elements = $context.find('.file').once('dreditor-inlineimage');

    $elements.find('> a').each(function () {
      var
        $link = $(this),
        // Generate inline image button (cannot be <a>, other scripts bind links).
        $button = $('<span class="dreditor-button dreditor-inlineimage">Embed</span>'),
        // Remove protocol + drupal.org
        url = $link.attr('href').replace(/^https\:\/\/drupal\.org/, '');

      // Only process image attachments.
      if (!$comment.length || !url.match(/\.png$|\.jpg$|\.jpeg$|\.gif$/)) {
        return;
      }

      // Append inline image button to attachment.
      $link.parent().prepend($button);

      // Override click event.
      $button
        .bind('click', function (e) {
          // Focus comment textarea.
          $('html, body').animate({
            scrollTop: $comment.offset().top
          }, 300);
          // Insert image tag to URL in comment textarea.
          $comment.focus().val($comment.val() + "\n<img src=\"" + url + "\" alt=\"\" />\n");
          e.preventDefault();
        });
    });
  }
};
