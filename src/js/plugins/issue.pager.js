/**
 * Duplicate the pager on top, can be handy at times.
 */
Drupal.behaviors.issuePager = {
	attach: function (context) {
		$('.comments', context).prepend($('.item-list').has('.pager').clone());
	}
};
