/**
 * Attach collapsing behavior to user project tables.
 */
Drupal.behaviors.dreditorProjectsCollapse = {
  attach: function (context) {
    var $tables = $('table.projects', context);
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
      .insertBefore('table.projects:first');

    if (!enabled) {
      return;
    }

    // First table does not have a heading.
    var $heading = $('h2#sandboxes').clone();
    $heading.html($heading.html().replace('Sandbox p', 'P'))
      .removeAttr('id')
      .insertBefore('table.projects:first');

    $tables.once('dreditor-projectscollapse', function () {
      var $table = $(this);
      $heading = $table.prevAll('h2').eq(0);
      $heading.css({ cursor: 'pointer' })
        .bind('click.projectscollapse', function () {
          // .slideToggle() forgets about table width in d.o's outdated jQuery
          // version.
          $table.toggle();
        })
        .triggerHandler('click');
    });
  }
};
