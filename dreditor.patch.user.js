// ==UserScript==
// @name           Dreditor: Patch review
// @namespace      http://unleashedmind.com/greasemonkey
// @description    Highlights and outlines diff syntax in patch files.
// @author         Daniel F. Kudwien (sun)
// @version        0.1
// @include        http://drupal.org/node/*
// @unwrap         1
// ==/UserScript==

// Initialize window objects.
$ = window.$ = window.jQuery = unsafeWindow.jQuery;
Drupal = window.Drupal = unsafeWindow.Drupal;

Drupal.patch = Drupal.patch || { behaviors: {} };

Drupal.behaviors.patchReviewer = function (context) {
  $('#attachments a, #comments table.comment-upload-attachments a', context).each(function () {
    if (this.href.indexOf('.patch') == -1) {
      return;
    }
    var $link = $('<a href="' + this.href + '">[ review ]</a>');
    $link.click(function () {
      // Load file.
      $.get(this.href, function (content, status) {
        if (status == 'success') {
          // Setup overlay, applying all patch.behaviors.
          $('#file-wrapper', context).animate({ height: '90%'}).show();
          var file_context = $('#file').get(0);
          $.each(Drupal.patch.behaviors, function () {
            this(file_context, content);
          });
        }
      });
      return false;
    });
    $link.appendTo(this);
  });
};

/**
 * Create diff outline and highlighting from plaintext code.
 *
 * @param context
 *   The context to work on.
 * @param code
 *   Plain-text code to parse.
 *
 * @todo Rewrite parser to work line-by-line; also to allow '@@ ...' in outline,
 *   i.e. .splitText("\n").
 * @todo Move setup and storage of outline menu and pastie outside.
 */
Drupal.patch.behaviors.diffView = function (context, code) {
  var $body = $(context);

  // Convert CRLF, CR into LF.
  code = code.replace(/\r\n|\r/g, "\n");
  // Remove cruft: Unversioned files.
  code = code.replace(/^\? .+\n/mg, '');

  // Build hunk menu.
  var $menu = $('<div id="bar"><ul id="menu"></ul></div>').prependTo($body).find('ul');
  code = code.replace(/^(\+\+\+ )([^\t]+)(\t.*)/mg, function (full, match1, match2, match3) {
    $menu.append('<li><a href="#' + match2 + '">' + match2 + '</a></li>');
    return match1 + '<a id="' + match2 + '">' + match2 + '</a>' + match3;
  });

  // Colorize file diff lines.
  code = code.replace(/^((Index|===|RCS|retrieving|diff|\-\-\- |\+\+\+ |@@ ).*)$/mg, '<pre class="file">$1</pre>');
  // Colorize old code, but skip file diff lines.
  code = code.replace(/^((?!\-\-\-)\-.*)$/mg, '<pre class="code old">$1<span /></pre>');
  // Colorize new code, but skip file diff lines.
  code = code.replace(/^((?!\+\+\+)\+.*)$/mg, '<pre class="code new">$1<span /></pre>');

  // Remove duplicate/empty PREs.
  code = code.replace(/<pre>\n<\/pre>/g, '');
  // Wrap all other lines in PREs for copy/pasting.
  code = code.replace(/^( .*)$/mg, '<pre class="code">$1<span /></pre>');
  // Wrap code in container.
  code = '<div id="code">' + code + '</div>';

  // Append code to body.
  $body.append(code);

  // Pastie.
  var $bar = $('#bar');
  $bar.append('<textarea id="pastie" class="resizable"></textarea>');

  // Apply selected Drupal behaviors.
  $.each(Drupal.behaviors, function () {
    this(context);
  });

  // Copy any selection.
  // @todo Basic concept only; we actually don't want to re-display code until
  //   it's pasted/submitted back into the original page.
  $('#code', context).mouseup(function () {
    var sel = document.getSelection().toString().replace(/\r\n|\r/g, "\n").replace(/\n\n/g, "\n");
    if (sel) {
      $('#pastie', context).val(sel);
    }
  });
};

jQuery(document).ready(function () {
  // Setup file review area/overlay.
  var $file = $('<div id="file-wrapper"><div id="file"></div></div>').hide();
  $file.appendTo('body');

  Drupal.behaviors.patchReviewer(this);
});

// Add custom stylesheet.
GM_addStyle(" \
#file-wrapper { position: fixed; z-index: 1000; width: 100%; top: 0; } \
#file { width: 90%; height: 90%; margin: auto auto; background-color: #fff; } \
#file #bar { position: absolute; width: 230px; padding: 0 10px; font: 10px/18px sans-serif, verdana, tahoma, arial; } \
#file #menu { margin: 0; padding: 0; } \
#file #menu li { margin: 0; padding: 0 10px 0; list-style: none; } \
#file a { text-decoration: none; } \
#file #pastie { width: 100%; height: 12em; font: 13px 'courier new', courier, 'lucida console'; color: #000; } \
#file #code { margin-left: 250px; border-left: 1px solid #ccc; padding-left: 10px; overflow: scroll; height: 100%; } \
#file pre { margin: 0; font: 13px 'courier new', courier, 'lucida console'; background-color: transparent; border: 0; padding: 0; } \
#file pre span { display: inline-block; margin-left: 2px; width: 2px; height: 7px; background-color: #ddd; } \
#file .file { color: #088; } \
#file .new { color: #00d; } \
#file .old { color: #d00; } \
");
