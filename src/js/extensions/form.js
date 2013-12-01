Drupal.dreditor.form = {
  forms: [],

  create: function (form_id) {
    return new this.form(form_id);
  }
};

Drupal.dreditor.form.form = function (form_id) {
  var self = this;

  // Turn this object into a jQuery object, being a form. :)
  $.extend(true, self, $('<form id="' + form_id + '"></form>'));

  // Override the default submit handler.
  self.submit(function () {
    // Unless proven wrong, we remove the form after submission.
    self.remove();
    // We never really submit.
    return false;
  });
};

Drupal.dreditor.form.form.prototype = {
  submitHandlers: {},

  addButton: function (op, onSubmit) {
    var self = this;
    self.submitHandlers[op] = onSubmit;
    var $button = $('<input name="op" class="dreditor-button" type="button" value="' + op + '" />');
    $button.bind('click.form', function () {
      self.submitHandlers[op].call(self, $button);
    });
    this.append($button);
    // Return the jQuery form object to allow for chaining.
    return this;
  }
};
