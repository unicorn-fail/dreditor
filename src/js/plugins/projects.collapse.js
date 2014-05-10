/**
 * Attach collapsing behavior to user project tables.
 */
Drupal.behaviors.dreditorProjectsCollapse = {
  attach: function (context) {
    var $tables = $(context).find('.view-project-issue-user-projects table');
    if (!$tables.length) {
      return;
    }
    var enabled = Drupal.storage.load('projectscollapse.status');

    // Add link to toggle this feature.
    $('<a href="#" class="dreditor-application-toggle"></a>')
      .text(enabled ? 'Always show projects' : 'Collapse projects')
      .click(function () {
        Drupal.storage.save('projectscollapse.status', !enabled);
        // Reload the current page without refresh from server.
        window.location.href = window.location.href;
        return false;
      })
      .insertBefore($tables.eq(0));

    if (!enabled) {
      return;
    }
    $tables.once('dreditor-projectscollapse', function () {
      var $elements = $(this).children(':not(caption)');
      $(this).css('width', '100%')
        .find('> caption')
        .css({ cursor: 'pointer' })
        .bind('click.projectscollapse', function () {
          // .slideToggle() forgets about table width in d.o's outdated jQuery
          // version.
          $elements.toggle();
        })
        .triggerHandler('click');
    });
  }
};
