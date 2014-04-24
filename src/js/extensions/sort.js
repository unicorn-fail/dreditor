/**
 * sort() callback to sort DOM elements by their actual DOM position.
 *
 * Copied from jQuery 1.3.2.
 *
 * @see Drupal.dreditor.patchReview.sort()
 */
var sortOrder, hasDuplicate;
if ( document.documentElement && document.documentElement.compareDocumentPosition ) {
  sortOrder = function( a, b ) {
    if (a && b && a.compareDocumentPosition) {
      var ret = a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
      if ( ret === 0 ) {
        hasDuplicate = true;
      }
      return ret;
    }
  };
} else if ( "sourceIndex" in document.documentElement ) {
  sortOrder = function( a, b ) {
    var ret = a.sourceIndex - b.sourceIndex;
    if ( ret === 0 ) {
      hasDuplicate = true;
    }
    return ret;
  };
} else if ( document.createRange ) {
  sortOrder = function( a, b ) {
    var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
    aRange.selectNode(a);
    aRange.collapse(true);
    bRange.selectNode(b);
    bRange.collapse(true);
    var ret = aRange.compareBoundaryPoints(window.Range.START_TO_END, bRange);
    if ( ret === 0 ) {
      hasDuplicate = true;
    }
    return ret;
  };
}
// end sortOrder
