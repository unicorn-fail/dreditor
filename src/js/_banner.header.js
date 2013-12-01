/**
 * Content Scope Runner.
 *
 * While Firefox/GreaseMonkey supports advanced DOM manipulations, Chrome does
 * not. For maximum browser compatibility, this user script injects itself into
 * the page it is executed on.
 *
 * Support and available features for user scripts highly varies across browser
 * vendors. Some browsers (e.g., Firefox) require to install a browser extension
 * (GreaseMonkey) in order to install and execute user scripts. Some others
 * have built-in support for user scripts, but do not support all features of
 * GreaseMonkey (variable storage, cross-domain XHR, etc). In the special case
 * of Chrome, user scripts are executed before the DOM has been fully loaded and
 * initialized; they can only access and manipulate the plain DOM document as
 * is, but none of the scripts on the actual page are loaded yet.
 *
 * Bear in mind, with Content Scope Runner, unsafeWindow and all other
 * GreaseMonkey specific features are not available.
 *
 * The global __PAGE_SCOPE_RUN__ variable is prepended to the user script to
 * control execution. Make sure this variable does not clash with actual page
 * variables.
 *
 * @see http://userscripts.org/scripts/show/68059
 * @see http://wiki.greasespot.net/Content_Scope_Runner
 *
 * @todo FIXME upstream:
 *   - Bogus SCRIPT type attribute.
 *   - data attribute throws MIME type warning in Chrome; textContent approach
 *     of earlier versions is correct.
 *   - Append to HEAD.
 *   - Removal/clean-up is completely invalid.
 *   - setTimeout() approach seems useless?
 *   - Code comments.
 */
/*jshint ignore:start*/
var dreditor_loader = function ($) {
/*jshint ignore:end*/
