/**
 * Attach issue count to project issue tables and hide fixed/needs more info issues without update marker.
 */
Drupal.behaviors.dreditorIssueCount = {
  attach: function (context) {
    $('table.project-issue', context).once('dreditor-issuecount', function () {
      var $table = $(this);
      var countTotal = $table.find('tbody tr').length;
      var countSuffix = ($table.parent().parent().find('.pager').length ? '+' : '');
      var countHidden = 0;

      var $container = $('<div class="dreditor-issuecount"></div>');
      $table.before($container);

      // Add link to toggle this feature.
      var enabled = Drupal.storage.load('issuecount.status');
      $('<a href="#" class="dreditor-application-toggle"></a>')
        .text(enabled ? 'Show all issues' : 'Hide irrelevant issues')
        .click(function () {
          Drupal.storage.save('issuecount.status', !enabled);
          // Reload the current page without refresh from server.
          window.location.href = window.location.href;
          return false;
        })
        .prependTo($container);

      if (enabled) {
        countHidden = $table.find('tr.state-2, tr.state-16').not(':has(.marker)').addClass('dreditor-issue-hidden').hide().length;
      }

      // Output optimized count (minus hidden).
      // Separate calculation required, or otherwise some browsers output NaN.
      var count = countTotal - countHidden;
      $container.append('<span class="dreditor-issuecount-total">Displaying <span class="count">' + count + '</span>' + countSuffix + ' issues.</span>');
      if (!countHidden) {
        return;
      }
      var $counter = $container.find('span.dreditor-issuecount-total span.count');

      // Output 'fixed' count.
      var $issuesFixed = $table.find('tr.state-2.dreditor-issue-hidden');
      if ($issuesFixed.length) {
        $('<a href="#" title="Show" class="dreditor-issuecount-hidden">' + $issuesFixed.length + ' fixed issues.' + '</a>')
          .click(function () {
            $issuesFixed.removeClass('dreditor-issue-hidden').show();
            $counter.text(parseInt($counter.text(), 10) + $issuesFixed.length);
            $(this).remove();
            return false;
          })
          .appendTo($container);
      }

      // Output 'needs more info' count.
      var $issuesInfo = $table.find('tr.state-16.dreditor-issue-hidden');
      if ($issuesInfo.length) {
        $('<a href="#" title="Show" class="dreditor-issuecount-hidden">' + $issuesInfo.length + ' issues need more info.' + '</a>')
          .click(function () {
            $issuesInfo.removeClass('dreditor-issue-hidden').show();
            $counter.text(parseInt($counter.text(), 10) + $issuesInfo.length);
            $(this).remove();
            return false;
          })
          .appendTo($container);
      }
    });
  }
};
