/**
 * Backs up form values before submit for potential later restore.
 *
 * drupal.org's advanced infrastructure may respond with totally bogus things
 * like HTTP redirects to completely invalid locations. Native support for
 * retaining previously posted form values in modern browsers is entirely
 * hi-jacked in those cases; the browser doesn't even know anymore that it
 * posted something.
 */
Drupal.behaviors.dreditorFormBackup = {
  attach: function (context) {
    $(context).find('#project-issue-node-form').once('dreditor-form-backup', function () {
      var $form = $(this);

      var $restore = $('<a href="javascript:void()" class="dreditor-application-toggle">Restore previously entered data</a>').click(function () {
        if (window.confirm('Reset this form to your last submitted values?')) {
          var values = Drupal.storage.unserialize(Drupal.storage.load('form.backup'));
          $form.find('[name]').not('[type=hidden]').each(function () {
            if (typeof values[this.name] !== 'undefined') {
              $(this).val(values[this.name]);
            }
          });
          // Remove this (restore) button.
          $(this).fadeOut();
        }
        return false;
      });

      $form.find('[type="submit"]')
        .bind('click', function () {
          Drupal.storage.save('form.backup', $form.serialize());
        })
        // @todo Replace with .eq(-1), available in jQuery 1.4+.
        .filter(':last').after($restore);
    });
  }
};
