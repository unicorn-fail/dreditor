/**
 * PIFT enhancements.
 */
Drupal.behaviors.dreditorPIFT = {
  attach: function (context) {
    var $context = $(context);
    $context.find('.field-name-field-issue-files').attr('id', 'recent-files');
    $context.find('.field-name-field-issue-files table').once('dreditor-pift', function () {
      var $table = $(this);
      $table.find('th[name*="size"], th[name*="uid"]').remove();
      var comments = 0;
      $table.find('tbody tr').each(function() {
        var $row = $(this);
        // File row.
        if ($row.is('.extended-file-field-table-row:not(.pift-test-info)')) {
          var $cid = $row.find('.extended-file-field-table-cid');
          var $file = $row.find('.extended-file-field-table-filename .file');
          var $size = $row.find('.extended-file-field-table-filesize');
          var $name = $row.find('.extended-file-field-table-uid');
          var comment = parseInt($cid.text().replace('#', ''), 10) || 0;
          $file.find('a:not(.dreditor-button)').before('<span class="size">' + $size.text() + '</span>');
          $size.remove();
          $cid.append($name.html());
          $name.remove();
          var $parentComment = $table.find('tr[data-comment="' + comment +'"]');
          var zebra = $parentComment.data('zebra');
          if (zebra) {
            $row.removeClass('odd even').addClass(zebra);
          }
          var $prevCid = $parentComment.find('.extended-file-field-table-cid');
          if ($prevCid.length) {
            var rowspan = $cid.attr('rowspan');
            $prevCid.attr('rowspan', ($prevCid.attr('rowspan') + rowspan));
            $cid.remove();
          }
          else {
            comments++;
            zebra = comments % 2 ? 'odd' : 'even';
            $row
              .attr({
                'data-comment': comment,
                'data-zebra': zebra
              })
              .removeClass('odd even')
              .addClass(zebra);
          }
        }
        // PIFT row.
        else if ($row.is('.pift-test-info')) {
          var $cell = $row.find('td');
          $row.prev().find('td:not(.extended-file-field-table-cid)').addClass($cell.attr('class'));
          $cell.find('.pift-operations').prependTo($cell);
        }
      });
    });

    $context.find('.field-name-field-issue-changes table.nodechanges-file-changes').once('dreditor-pift', function() {
      var $table = $(this);
      $table.find('th:last').remove();
      $table.find('tbody tr').each(function() {
        var $row = $(this);
        // PIFT row.
        if ($row.is('.pift-test-info')) {
          var $cell = $row.find('td');
          $row.prev().find('td').addClass($cell.attr('class'));
          $cell.find('.pift-operations').prependTo($cell);
        }
        // File row.
        else {
          var $file = $row.find('.nodechanges-file-link .file');
          var $size = $row.find('.nodechanges-file-size');
          $file.find('a:not(.dreditor-button)').before('<span class="size">' + $size.text() + '</span>');
          $size.remove();
        }
      });
    });
  }
};
