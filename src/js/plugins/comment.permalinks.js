/**
 * Restores sensible comment permalinks.
 */
Drupal.behaviors.dreditorCommentPermalinks = {
  attach: function (context) {
    var path = window.location.pathname;
    $(context).find('.comment > .permalink').once('dreditor-permalinks', function () {
      // Pre-D7 issue#comment URL, suitable for IRC/Druplicon.
      this.href = path + this.hash;

      // Issue filter link macro.
      // @todo Href produces a URL. HTML5 Clipboard API does not allow to copy
      //   custom values.
      // @see http://caniuse.com/#feat=clipboard
      // @see http://www.w3.org/TR/clipboard-apis/
//      if (window.ClipBoardEvent) {
//        var macro = '[#' + /\d+$/.exec(path) + '-' + comment + ']';
//        var $link = $('<a rel="filter" href="' + macro + '"' + classAttr + '>' + macro + '</a>');
//        $link.click(function (e) {
//          e.preventDefault();
//          var copyEvent = new window.ClipBoardEvent('copy', { dataType: 'text/plain', data: 'macro' });
//          document.dispatchEvent(copyEvent);
//        });
//        $container.append($link);
//      }
    });
  }
};
