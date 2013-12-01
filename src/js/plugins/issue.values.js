/**
 * Prepopulate issue creation form with last used values.
 */
Drupal.behaviors.dreditorIssueValues = {
  attach: function (context) {
    // This catches only the issue creation form, since project issue/release data
    // cannot be altered on node/#/edit.
    $('#node-form:has(#edit-rid)', context).once('dreditor-issuevalues', function () {
      var $form = $(this);
      var values = Drupal.storage.load('issuevalues');
      if (values) {
        $.each(Drupal.storage.unserialize(values), function (name, value) {
          $form.find(':input[name=' + name + ']').val(value);
        });
      }
      $form.submit(function () {
        Drupal.storage.save('issuevalues', Drupal.storage.serialize($('.inline-options:first :input', $form)));
      });
    });
  }
};
