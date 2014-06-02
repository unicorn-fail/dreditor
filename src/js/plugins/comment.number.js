/**
 * Exposes the predicted number for a new comment.
 *
 * The (sequential) comment number is commonly used as suffix in patch names.
 * This plugin simply exposes the predicted new comment number in the
 * "Add new comment" heading of the issue comment/update form (block), so that
 * contributors do not have to manually make the math.
 */
Drupal.behaviors.dreditorCommentNumber = {
  attach: function (context) {
    $(context).find('#block-project-issue-issue-edit h2')
      .append(' <strong>#' + Drupal.dreditor.issue.getNewCommentNumber() + '</strong>');
  }
};
