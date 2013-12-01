/**
 * Cleans up views exposed filter form values before the filter form is submitted.
 *
 * The purpose is that only non-default views filters are contained in the
 * resulting GET query parameters. Better and cleaner for sharing links to a
 * certain filtered issue queue result.
 *
 * Input elements (except multiple selects) always serialize into an empty
 * string, so the entire element needs to be disabled.
 */
Drupal.behaviors.dreditorIssuesFilterFormValuesClean = {
  attach: function (context) {
    $('.view-filters form', context).once('dreditor-issues-form-values-clean', function () {
      $(this).submit(function (event) {
        $.each(event.target.elements, function (index, element) {
          var $element = $(element);
          var value = $element.val();
          switch (element.name) {
            case 'text':
            case 'assigned':
            case 'submitted':
            case 'participant':
            case 'issue_tags':
              if (value === '') {
                element.disabled = true;
              }
              break;

            case 'status':
              if (value === 'Open') {
                element.disabled = true;
              }
              break;

            case 'priorities':
            case 'categories':
            case 'version':
            case 'component':
              if (value === 'All') {
                element.disabled = true;
              }
              break;

            case 'issue_tags_op':
              if (value === 'or') {
                element.disabled = true;
              }
              break;
          }
        });
      });
    });
  }
};

/**
 * Add a 'Reset' button to project issue exposed views filter form.
 */
Drupal.behaviors.dreditorIssuesFilterFormReset = {
  attach: function (context) {
    if (!window.location.search) {
      return;
    }
    $('.view-filters form', context).once('dreditor-issues-form-reset', function () {
      var $form = $(this);
      var $container = $form.find('input.form-submit').parent();
      var $button = $container.clone().find('input').val('Reset').click(function () {
        // Reload the current page without query string and without refresh.
        Drupal.dreditor.redirect(null, { query: '' });
        return false;
      }).end();
      $container.after($button);
    });
  }
};
