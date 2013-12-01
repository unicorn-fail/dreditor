/*jshint ignore:start*/
// End of Content Scope Runner.
};
/*jshint ignore:end*/

// If not already running in the page, inject this script into the page.
if (typeof __PAGE_SCOPE_RUN__ === 'undefined') {
  // Define a closure/function in the global scope in order to reference the
  // function caller (the function that executes the user script itself).
  (function page_scope_runner() {
    // Retrieve the source of dreditor_loader, inject and run.
    var self_src = '(' + dreditor_loader.toString() + ')(jQuery);';

    // Add the source to a new SCRIPT DOM element; prepend it with the
    // __PAGE_SCOPE_RUN__ marker.
    // Intentionally no scope-wrapping here.
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.textContent = "var __PAGE_SCOPE_RUN__ = true;\n" + self_src;

    // Inject the SCRIPT element into the page.
    var head = document.getElementsByTagName('head')[0];
    head.appendChild(script);
  })();

  // End execution. This code path is only reached in a GreaseMonkey/user
  // script environment. User script environment implementations differ; not all
  // browsers (e.g., Opera) understand a return statement here, and it would
  // also prevent inclusion of this script in unit tests. Therefore, the entire
  // script needs to be wrapped in a condition.
}
// Drupal is undefined when drupal.org is down.
else if (typeof Drupal === 'undefined') {
}
// Execute the script as part of the content page.
else {
  dreditor_loader(jQuery); /*jshint ignore:line*/
}
