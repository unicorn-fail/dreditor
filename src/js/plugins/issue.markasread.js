/**
 * Attach mark as read to project issue tables.
 */
Drupal.behaviors.dreditorIssueMarkAsRead = {
  attach: function (context) {
    $('table.project-issue', context).once('dreditor-issuemarkasread', function () {
      var throbber = '<div class="ajax-progress ajax-progress-throbber"><div class="throbber">&nbsp;</div></div>';
      $(throbber).appendTo(this).hide();

      // 'a + .marker' accounts for a d.o bug; the HTML markup contains two
      // span.marker elements, the second being nested inside the first.
      var $markers = $(this).find('a + .marker').addClass('clickable');

      var $markAll = $('<a href="#" class="dreditor-application-toggle">Mark all as read</a>')
        .click(function (e) {
          $(this).append(throbber);
          $markers.trigger('click.dreditor-markasread');
          e.preventDefault();
          e.stopPropagation();
        });
      if ($markers.length) {
        $markAll.prependTo($(this).parent());
      }

      $markers.bind('click.dreditor-markasread', function () {
        var $marker = $(this);
        $marker.append(throbber);
        var $link = $marker.prev('a');
        $.ajax({
          // The actual HTML page output is irrelevant, so denote that by using
          // the appropriate HTTP method.
          type: 'HEAD',
          url: $link.attr('href'),
          complete: function () {
            $markers = $markers.not($marker);
            if (!$markers.length) {
              $markAll.remove();
            }
            $marker.remove();
          }
        });
      });
    });
  }
};
