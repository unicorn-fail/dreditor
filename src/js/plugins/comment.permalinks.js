/**
 * Restores sensible comment permalinks.
 */
Drupal.behaviors.dreditorCommentPermalinks = {
  attach: function (context) {
    $(context).find('.comment > .permalink').once('dreditor-permalinks', function () {
      var $container = $('<div class="dreditor-permalinks"></div>').insertBefore(this);
      var classAttr = ' class="permalink dreditor-permalinks-processed"';
      var path = window.location.pathname;
      var comment = /\d+$/.exec(this.text);

      // Pre-D7 issue#comment URL, suitable for IRC/Druplicon.
      $container.append('<a rel="irc" href="' + path + this.hash + '"' + classAttr + '>#' + comment + '</a>');

      // Issue filter link macro.
      // @todo Href produces a URL. HTML5 Clipboard API does not allow to copy
      //   custom values.
      // @see http://caniuse.com/#feat=clipboard
      // @see http://www.w3.org/TR/clipboard-apis/
//      if (window.ClipBoardEvent) {
//        var macro = '[#' + /\d+$/.exec(window.location.pathname) + '-' + comment + ']';
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
