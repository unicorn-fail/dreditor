/**
 * Attach commit message generator to issue comment form.
 */
Drupal.behaviors.dreditorCommitMessage = {
  attach: function (context) {
    // Attach this behavior only to project_issue nodes. Use a fast selector for
    // the common case, but also support comment/reply/% pages.
    var $context = $(context);
    if (!($context.find('body.node-type-project-issue').length || $context.find('div.project-issue').length)) {
      return;
    }
    var self = this;
    $context.find('#project-issue-ajax-form .form-item-nodechanges-comment-body-value .form-textarea-wrapper').once('dreditor-commitmessage', function () {
      // Prepend commit message button to comment form.
      // @todo Generalize this setup. Somehow.
      var $container = $('<div class="dreditor-actions"></div>');
      $(this).before($container);
      // Generate commit message button.
      var $link = $('<a class="dreditor-application-toggle dreditor-commitmessage" href="#">Create commit message</a>');
      $link.click(function () {
        // A port of PHP's array_count_values(), combined with a keysort.
        $.fn.extend({
          countvalues: function () {
            var elems = this.get();
            // Count array values.
            var counts = {}, i = elems.length, j;
            while (i--) {
              var value = elems[i].textContent;
              j = counts[value];
              counts[value] = (j ? j + 1 : 1);
            }
            // Sort value counts by counts.
            var temp = [];
            for (var key in counts) {
              temp.push([ counts[key], key ]);
            }
            temp.sort(function (a, b) {
              return a[0] > b[0];
            });
            // Return the list of values, ordered by counts (descending).
            var result = [];
            i = temp.length;
            while (i--) {
              result.push(temp[i][1]);
            }
            return result;
          }
        });

        // Build list of top patch submitters.
        var $submitters = $context.find('.field-name-field-issue-files table tr:has(a.dreditor-patchreview) a.username');

        // Count and sort by occurrences.
        var submitters = $submitters.countvalues();

        // Build list of unique users for commit attribution, keyed by uid.
        var users = {};
        $submitters.each(function () {
          users[this.textContent] = {
            id: this.getAttribute('data-uid'),
            name: this.textContent,
            href: this.href
          };
        });

        // Retrieve all comments in this issue.
        var $comments = $context.find('section.comments div.comment');

        // Build list of top commenters.
        var commenters = $comments.find('div.author a')
          // Skip test bot.
          .not(':contains("System Message")')
          // Add original poster.
          .add('div.node div.submitted a')
          // Count and sort by occurrences.
          .countvalues();
        // Compile a list of top commenters (max. 10% of # of all follow-ups).
        var contributors = [];
        var max = parseInt(($comments.length > 10 ? $comments.length : 10) / 10, 10);
        if (max) {
          $.each(commenters, function(index, name) {
            if (max < 1) {
              return false;
            }
            // Skip already listed contributors.
            for (var i in submitters) {
              if (submitters[i] === name) {
                return;
              }
            }
            contributors.push(name);
            max--;
          });
        }
        // Build commit message.
        // @todo Add configuration option for prefix. For now, manually override:
        //   Drupal.storage.save('commitmessage.prefix', '-');
        var prefix = Drupal.storage.load('commitmessage.prefix');
        prefix = (prefix ? prefix : 'Issue');

        var message = prefix + ' #' + Drupal.dreditor.issue.getNid() + ' ';
        message += 'by ' + submitters.join(', ');
        if (contributors.length) {
          if (submitters.length) {
            message += ' | ';
          }
          // Add a separator between patch submitters and commenters.
          message += contributors.join(', ');
        }

        // Build title.
        // Use the text input field value to allow maintainers to adjust it
        // prior to commit.
        var title = $('#edit-title').val();

        // Add "Added|Fixed " prefix based on issue category.
        switch ($('#edit-field-issue-category-und').val()) {
          case 'bug':
          case '1':
            title = title.replace(/^fix\S*\s*/i, '');
            title = 'Fixed ' + title;
            break;

          case 'feature':
          case '3':
            title = title.replace(/^add\S*\s*/i, '');
            title = 'Added ' + title;
            break;

          default:
            // For anything else, we just ensure proper capitalization.
            if (title[0].toLowerCase() === title[0]) {
              title = title[0].toUpperCase() + title.substring(1);
            }
            break;
        }

        // Add a period (full-stop).
        if (title[title.length - 1] !== '.') {
          title += '.';
        }
        message += ': ' + title;

        // Inject a text field.
        var $input = $context.find('#dreditor-commitmessage-input');
        if (!$input.length) {
          // Setup first input widget for plain commit message.
          // @todo Revise animation for box-sizing:border-box.
          $input = $('<input id="dreditor-commitmessage-input" class="dreditor-input" type="text" autocomplete="off" />')
            .css({ position: 'absolute', right: $link.outerWidth(), width: 0 })
            .val(message)
            .insertAfter($link);
          $link.css({ position: 'relative', zIndex: 1 }).before($input);

          // Setup second input widget for full git commit command line.
          self.createShellCommand = function (message, user) {
            // -a is evil; people should use apply/am to apply patches, and many
            // use 'git add -p' to selectively stage and commit changes.
            // Also make sure any PHP variables are properly excaped.
            var command = 'git commit -m "' + message.replace(/(\$|")/g, "\\$1") + '"';
            if (user && user.attribution) {
              command += ' --author="' + user.attribution + '"';
            }
            return command;
          };
          var $commandContainer = $('<div id="dreditor-commitmessage-command" style="clear: both; padding: 1em 0;" />')
            .appendTo($container);
          var $commandInput = $('<input class="dreditor-input" type="text" autocomplete="off" />')
            .val(self.createShellCommand(message));

          // Add user list as commit attribution choices.
          var user;
          for (user in users) {
            var $userLink = $('<a href="#/user/' + users[user].id + '/git-attribution" class="choice">' + users[user].name + '</a>')
              .data('user', users[user]);
            $userLink.click(function () {
              var link = this;
              // @todo Cache response per user.
              $.getJSON(this.hash.substring(1), function (response) {
                users[user].attribution = response.author;
                $commandInput
                  // Take over current commit message (might have been customized).
                  .val(self.createShellCommand($input.val(), users[user]))
                  .get(0).select();
                $(link).addClass('selected').siblings().removeClass('selected');
              });
              return false;
            }); // jshint ignore:line
            $commandContainer.append($userLink);
          }

          $input.animate({ width: $container.width() - $link.width() - 10 }, null, null, function () {
            this.select();

            // Make the commit message text input dynamically attach to the bottom
            // of the viewport upon scrolling.
            var $window = $(window);
            var inputOffset = $input.offset().top;
            var inputOriginalStyle = $input.attr('style');
            $window.scroll(function () {
              if (inputOffset > $window.scrollTop() + $window.height()) {
                $input.css({ position: 'fixed', bottom: 0 });
              }
              else {
                $input.attr('style', inputOriginalStyle);
              }
            });

            // Inject the shell command widget.
            $commandContainer.hide().append($commandInput).slideDown('fast');
          });

          $link.one('click', function () {
            $commandContainer.slideUp('fast');
            $input.animate({ width: 0 }, null, null, function () {
              $commandContainer.remove();
              $input.remove();
            });
            return false;
          });
        }
        return false;
      });
      $link.prependTo($container);
    });
  }
};
