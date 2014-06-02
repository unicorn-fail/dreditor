/**
 * Attach image attachment inline HTML injector to file attachments.
 */
Drupal.behaviors.dreditorInlineImage = {
  attach: function (context) {
    var $context = $(context);
    var $comment = $(':input[name="nodechanges_comment_body[value]"]');

    // @todo .file clashes with patchReviewer tr.file + a.file markup.
    $context.find('span.file').once('dreditor-inlineimage').find('> a').each(function () {
      var $link = $(this);

      // Remove protocol + drupal.org
      var url = $link.attr('href').replace(/^https\:\/\/drupal\.org/, '');

      // Only process image attachments.
      if (!$comment.length || !url.match(/\.png$|\.jpg$|\.jpeg$|\.gif$/)) {
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
            scrollTop: $comment.offset().top
          }, 300);
          // Insert image tag to URL in comment textarea.
          $comment.focus().val($comment.val() + "\n<img src=\"" + url + "\" alt=\"\" />\n");
          e.preventDefault();
        });
    });
  }
};
