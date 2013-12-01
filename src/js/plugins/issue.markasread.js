/**
 * Attach mark as read to project issue tables.
 */
Drupal.behaviors.dreditorIssueMarkAsRead = {
  attach: function (context) {
    $('table.project-issue', context).once('dreditor-issuemarkasread', function () {
      $(this).find('.marker').addClass('clickable').bind('click.dreditor-markasread', function () {
        var $marker = $(this);
        var $link = $marker.prev('a');
        $.ajax({
          // The actual HTML page output is irrelevant, so denote that by using
          // the appropriate HTTP method.
          type: 'HEAD',
          url: $link.attr('href'),
          complete: function () {
            $marker.remove();
          }
        });
      });
    });
  }
};
