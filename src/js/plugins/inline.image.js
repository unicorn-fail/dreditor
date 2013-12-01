/**
 * Attach image attachment inline HTML injector to file attachments.
 */
Drupal.behaviors.dreditorInlineImage = {
  attach: function (context) {
    $('#upload-attachments, #comment-upload-attachments', context).once('dreditor-inlineimage', function () {
      $(this).find('div.description').each(function () {
        var url = $(this).text();
        // Only process image attachments.
        if (!url.match(/\.png$|\.jpg$|\.jpeg$|\.gif$/)) {
          return;
        }
        // Generate inline image button.
        var $button = $('<a class="dreditor-button dreditor-inlineimage" href="javascript:void(0);">Embed</a>').click(function () {
          var desc = $(this).parent().siblings('input').val();
          var image = '<img src="' + url + '" alt="' + desc + '" />';
          // Append image to issue comment textarea (context is AHAH content here).
          $('#edit-body, #edit-comment').val($('#edit-body, #edit-comment').val() + "\n" + image + "\n");
          return false;
        });
        // Append inline image button to attachment.
        $button.appendTo(this);
      });
    });
  }
};
