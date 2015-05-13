/**
 * Helps to link the the last page with comments so that the #new works,
 * useful for issues with more than 300 comments.
 */
Drupal.behaviors.newComments = {
	threshold: 300,

	attach: function (context) {
		$('td.replies a, td.views-field-comment-count a', context).each(function() {
			var replies = $(this).parents('td').eq(0).html().match(/[0-9]+/);
			var newposts = $(this).html().match(/[0-9]+/);
			if (replies && newposts) {
				var read = replies - newposts;
				if (read >= Drupal.behaviors.newComments.threshold) {
					var page = parseInt(read/Drupal.behaviors.newComments.threshold, 10);
					$(this).attr('href', $(this).attr('href').replace('#new', '?page=' + page + '#new'));
				}
			}
		});
	}
};
