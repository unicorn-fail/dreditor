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
      $table.find('tbody tr').each(function() {
        var $row = $(this);
        // File row.
        if ($row.is('.extended-file-field-table-row:not(.pift-test-info)')) {
          var $cid = $row.find('.extended-file-field-table-cid');
          var $file = $row.find('.extended-file-field-table-filename .file');
          var $size = $row.find('.extended-file-field-table-filesize');
          var $name = $row.find('.extended-file-field-table-uid');
          var comment = parseInt($cid.text().replace('#', ''), 10) || 0;
          $file.prepend('<span class="size">' + $size.text() + '</span>');
          $size.remove();
          $cid.append($name.html());
          $name.remove();
          var $prevCid = $table.find('tr[data-comment="' + comment +'"] .extended-file-field-table-cid');
          if ($prevCid.length) {
            var rowspan = $cid.attr('rowspan');
            $prevCid.attr('rowspan', ($prevCid.attr('rowspan') + rowspan));
            $cid.remove();
          }
          else {
            $row.attr('data-comment', comment);
          }
        }
        // PIFT row.
        else if ($row.is('.pift-test-info')) {
          var $cell = $row.find('td');
          $row.prev().find('td:not(.extended-file-field-table-cid)').addClass($cell.attr('class'));
          $cell.find('.pift-operations').prependTo($cell).find('a').each(function () {
            if (this.innerText === 'View') {
              this.innerText = Drupal.t('View Results');
            }
            else if (this.innerText === 'Retest') {
              this.innerText = Drupal.t('Re-test');
            }
          });
        }
      });
    });

    $context.find('.field-name-field-issue-changes table.nodechanges-file-changes').each(function() {
      var $new = $(this);
      var $parent = $new.parent();
      $parent.once('dreditor-pift', function () {
        "use strict";
        var tables = {
          'new': $new,
          'hidden': $new.clone(),
          'deleted': $new.clone()
        };
        for (var status in tables) {
          tables[status].find('th:last').remove();
          tables[status].find('tbody tr').each(function() {
            var $row = $(this);
            // File row.
            if ($row.is('.pift-file-info')) {
              if ($row.find('.nodechanges-file-status').text() !== status) {
                $row.remove();
              }
              var $file = $row.find('.nodechanges-file-link .file');
              var $size = $row.find('.nodechanges-file-size');
              $file.prepend('<span class="size">' + $size.text() + '</span>');
              $size.remove();
            }
            // PIFT row.
            else if ($row.is('.pift-test-info')) {
              if (status !== 'new') {
                $row.remove();
              }
              var $cell = $row.find('td');
              $row.prev().find('td').addClass($cell.attr('class'));
              $cell.find('.pift-operations').prependTo($cell).find('a').each(function () {
                if (this.innerText === 'View') {
                  this.innerText = Drupal.t('View Results');
                }
                else if (this.innerText === 'Retest') {
                  this.innerText = Drupal.t('Re-test');
                }
              });
            }
          }); // jshint ignore:line
        }
        if (!tables.new.find('tbody tr').length) {
          tables.new.remove();
        }
        var $fieldset,
          hiddenCount = tables.hidden.find('tbody tr').length,
          deletedCount = tables.deleted.find('tbody tr').length;
        if (hiddenCount) {
          tables.hidden.wrap('<fieldset class="collapsible collapsed"><div class="fieldset-wrapper"></div></fieldset>');
          $fieldset = tables.hidden.parent().parent();
          $fieldset.prepend('<legend><span class="fieldset-legend">' + Drupal.formatPlural(hiddenCount, '1 file was hidden', '@count files were hidden') + '</span></legend>');
          $fieldset.appendTo($parent);
        }
        if (deletedCount) {
          tables.deleted.wrap('<fieldset class="collapsible collapsed"><div class="fieldset-wrapper"></div></fieldset>');
          $fieldset = tables.deleted.parent().parent();
          $fieldset.prepend('<legend><span class="fieldset-legend">' + Drupal.formatPlural(deletedCount, '1 file was deleted', '@count files were deleted') + '</span></legend>');
          $fieldset.appendTo($parent);
        }
        Drupal.attachBehaviors($parent);
        $parent.append('<p><a href="#recent-files">Back to recent files</a></p>');
      });
    });
  }
};
