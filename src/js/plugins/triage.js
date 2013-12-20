//    //    // Prepend commit message button to comment form.
//    // @todo Generalize this setup. Somehow.
//    if (!$container.length) {
//      $container = $('<div class="dreditor-actions" style="width: 95%"></div>');
//      $(this).prepend($container);
//    }
//
//    $container.css('overflow', 'visible');
//    // Add margin from tags field
//    $container.css('margin-top', '20px');
//    var tabs = Drupal.dreditor.ux.tabs;
//    tabs.createTabContainer($container);
//    $link.wrap('<p>').css('float', 'none');
//    var $commit = $link.parent();
//    $commit.css('text-align', 'right');
//    tabs.addTab($container, 'Commit message', 'id-1', $commit);
//    tabs.addTab($container, 'Macro &amp; Templates', 'dreditor-triage-root', $('<p>').text('Replaced by sub tabs'));
//
//    // Inject triage
//    var $content = $('.dreditor-tab-content.dreditor-triage-root').empty();
//    Drupal.dreditor.triage.setup($content);
//    tabs.init();
//    tabs.bind();
//    tabs.injectCSS();
//  });
//};

/**
 * Placeholder for managing triage or issue management
 *
 * We have the source pages on d.o which are loaded through a cache handler.
 * The pages containing a DL are processed into UL which contain commands
 * to manage an issue on d.o
 */
Drupal.dreditor.triage = {
  /**
   * Getter for hideIrrelevant
   */
  getHideIrrelevant : function() {
    var current = Drupal.storage.load('triage-hide-irrelevant');
    if (typeof current === 'undefined') {
      current = false;
      Drupal.storage.save('triage-hide-irrelevant', current);
    }
    return current;
  },
  /**
   * Setter for hideIrrelevant
   *
   * @param current
   *   current state of irrelevancy
   */
  setHideIrrelevant : function(current) {
    Drupal.storage.save('triage-hide-irrelevant', current);
    return current;
  },
  /**
   * Give user possibility to hide irrelevant options.
   *
   * This is usefull when having a lot of issue state change options.
   * Not all options are relavant with respect to the current state.
   * 
   * @param {type} toggle
   * @returns {any|Boolean|Drupal.dreditor.triage.getHideIrrelevant.current|Drupal.dreditor.triage.hideIrrelevant.current}
   */
  hideIrrelevant : function(toggle) {
    if (typeof toggle === 'undefined') {
      toggle = true;
    }
    var current = Drupal.dreditor.triage.getHideIrrelevant();
    if (toggle) {
      current = !current;
    }

    if (current) {
      $('.triage-top-level').addClass('triage-hide-irrelevant');
    }
    else {
      $('.triage-top-level').removeClass('triage-hide-irrelevant');
    }

    Drupal.dreditor.triage.setHideIrrelevant(current);
    return current;
  },
  /**
   * The root book page containing triage child pages
   *
   * For now we only use the child pages of the root
   *
   * We could use the hierarchy later on to add project
   * specific sub Macro and Templates
   */
  getTriageRoot : function() {
    return {
      id : 'node-1120672',
      url : "//drupal.org/node/1120672",
      description : 'The root for all triage nodes'
    };
  },
  /**
   * Downloads a file and then store it for later reuse
   *
   * As we can only get data from the same domain
   * we better log bad requests to help our users.
   *
   * So in our tests we populate the cache so bypass this.
   *
   * @see http://en.wikipedia.org/wiki/Same_origin_policy
   */
  getFile : function(id, src, callback) {
    var data = Drupal.cache.get(id, 'triage');
    if (data) {
      window.console.log("getFile: cache hit: " + id);
      callback(data);
    }
    else {
      window.console.log("getFile: cache miss: " + id);
      $.ajax({
        url : src,
        success: function(data) {
          Drupal.cache.set(id, data, 'triage');
          callback(data);
        },
        dataType: 'html'
      });
    }

  },
  /**
   * The menu for triage
   */
  menu : function() {
    var $triageOptions = $('#dreditor-triage-options');
    $triageOptions.css('float', 'right');

    var $ul = $('<ul id="dreditor-triage-menu">');

    // TODO: remove next lines when committing to dreditor
    var $li = $('<li><strong><a href="https://github.com/dreditor/dreditor/pull/93">Using PR version</a></strong></li>');
    $li.appendTo($ul);
    $li = $('<li><strong><a href="https://dreditor.org/">Switch back to original dreditor</a></strong></li>');
    $li.appendTo($ul);
    // TODO: END remove above lines

    $li = $('<li>');
    $li.appendTo($ul);
    var $action = $('<a>')
      .attr('href', '#').text('Reset')
      .appendTo($li)
      .click(function() {
        Drupal.cache.clear('triage');
        $('#dreditor-triage-list').empty();
        var $triage = $('#dreditor-triage');
        $triage.empty();
        var $container = $triage.parent();
        Drupal.dreditor.triage.setup($container);
        return false;
      }
    );
    $li = $('<li>');
    $li.appendTo($ul);
    $action = $('<a>')
      .attr('href', '#')
      .appendTo($li)
      .click(function() {
        Drupal.dreditor.triage.hideIrrelevant();
        if (Drupal.dreditor.triage.getHideIrrelevant()) {
          $(this).text('Show irrelevant');
        }
        else {
          $(this).text('Hide irrelevant');
        }
        return false;
      }
    );
    // When clicking we toggle the value so pre-toggle to prevent corrupting
    Drupal.dreditor.triage.setHideIrrelevant(!Drupal.dreditor.triage.getHideIrrelevant());
    //Click on the action to prepare its state.
    $action.click();

    $li = $('<li>');
    $li.appendTo($ul);
    $action = $('<a>')
      .attr('href', '#').text('Set custom source')
      .appendTo($li)
      .click(function() {
        var custom = window.prompt('Give the URL of your custom DL tree.' +
          "\n\n" + 'This URL must point to a location on http://drupal.org' +
          "\n\n" + 'See http://en.wikipedia.org/wiki/Same_origin_policy', Drupal.storage.load('triage-custom'));
        if (custom) {
          Drupal.storage.save('triage-custom', custom);
        }
        else {
          Drupal.storage.remove('triage-custom');
        }
        Drupal.dreditor.triage.setup();
        // TODO: As personal sources are to be trusted we could allow for more automation
        return false;
      }
    );
    $ul.hide().appendTo($triageOptions);
    var $img = $('<a class="dreditor-application-toggle dreditor-commitmessage" href="#">Config Macro &amp; Templates</a>');
    $img.prependTo($triageOptions);
    $img.click(function(){
      $ul.toggle('slow');
      return false;
    });
  },
  /**
   * Add the tabs for different triage sources / nodes
   *
   * All except the custom node are supposed to come from the triage root nodes
   * 
   * @param {type} sources
   * @returns {undefined}
   */
  tabs : function(sources) {
    // Get the current project title to decide to show its stock responses.
    var currentProject = Drupal.dreditor.issue.getCurrent('project_title');
    var $ul = $('<ul>').addClass('dreditor-triage-full-list');
    $ul.appendTo('#dreditor-triage-list');

    // Only allow sources matching Default, Custom and Current project
    $.each(sources, function(source) {
      var sourceProject = sources[source].description;
      if (!(sourceProject === '_default' || sourceProject === "_custom" || sourceProject === currentProject)) {
                window.console.log('Skipping project "' + sourceProject +'"');
        return;
      }
      var label = sources[source].description;
      var $link = $('<li><a href="#">' + label + '</a></li>');
      $link.appendTo($ul);
      $link.click( function() {
        var $this = $(this);
        var $that = $this;
        if ($this.hasClass('get-processed')) {
          return false;
        }
        $this.addClass('get-processed');
        // Generate options list
        var src = sources[source].url;
        var id = sources[source].id;
        var label = sources[source].description;

        var ajaxSuccess = function(data) {
          var $placeholder = $that;
          // Find the first dl on the page
          var $dl = $(data).find('dl:first');
          /*
           * We need to fix input format quirks
           *
           * Here we fix project issue [#1234567]
           */
          $('.project-issue-status-info > a', $dl).each(function() {
            var $this =$(this);
            var m = $this.text().match(/^#([0-9]+):/);
            if (m) {
              $this.parent().replaceWith('[#' + m[1] + ']');
            }
          });
          Drupal.dreditor.triage.parseDefinitionList($placeholder, $dl);
          Drupal.dreditor.triage.decorateList($('ul:first', $placeholder));

          var $options = $("#dreditor-triage-list");
          // The menu float right so we need to make sure the are not block by the macro's'
          $options.css('width', '75%');

          $placeholder.find('li').addClass('triage-not-in-context');
          // Remove not-in-context from self and parents of in-context
          $placeholder.find('li.triage-in-context').
            removeClass('triage-not-in-context').
            parents().
            removeClass('triage-not-in-context')
          ;
          // Place children into context
          $placeholder.
            find('li.triage-in-context li').
            removeClass('triage-not-in-context')
          ;
          Drupal.dreditor.triage.hideIrrelevant(false);
          // Add view and edit links to the bottom of the list to the source.
          var $top = $('ul.level-1', $placeholder);
          var $linkT = $('<li>').appendTo($top).addClass('source');
          // Link to Source
          $('<a>')
            .text('view')
            .attr('href', src = sources[source].url)
            .attr('title', 'View the ' + label + ' set of templates and macros.')
            .attr('target', '_blank')
            .appendTo($linkT)
          ;
          $('<span> or </span>').appendTo($linkT);
          // Link to edit
          $('<a>')
            .text('edit')
            .attr('href', src = sources[source].url + '/edit')
            .attr('title', 'Edit the ' + label + ' set of templates and macros.')
            .attr('target', '_blank')
            .appendTo($linkT)
          ;
        };
        Drupal.dreditor.triage.getFile(id, src, ajaxSuccess);
        return false;
      });
    });
  },
  /**
   * Build the triage container
   *
   * @param $container (optional)
   *   We stuff the layout before the given $container
   */
  setup : function($container) {
    $container.css('overflow', 'visible');
    // Add margin from tags field
    $container.css('margin-top', '20px');
    // Zap the div
    var $root = $('.dreditor-tab-content.dreditor-triage-root').empty();

    var $triage = $('#dreditor-triage');
    if ($triage.length === 0) {
      // First time call so setup
      $triage = $('<div id="dreditor-triage" style="width: 95%">');
      //$triage.prependTo($container.parent());
      $triage.appendTo($root);
      $triage.css('overflow', 'initial');
    }
    // We rebuild the container
    $triage.empty();
    $('<div id="dreditor-triage-options">').appendTo($triage);
    //$('<div id="dreditor-triage-tabs">').appendTo($triage);
    $('<div id="dreditor-triage-list">').appendTo($triage);

    Drupal.dreditor.triage.menu();

    var $triages = $('<div>');
    $triages.css('clear', 'right');
    $triages.appendTo($triage);
    // Prevent injecting banner multiple times
    Drupal.dreditor.triage.bannerInjected = false;

    var root = Drupal.dreditor.triage.getTriageRoot();
    Drupal.dreditor.triage.getFile(root.id, root.url, function(data) {
      var sources = [];
      var $links = $('.book-navigation ul:first li a', $(data));
      $links.each(function(){
        var $this = $(this);
        var source = {
          id: $this.attr('href').replace(/^\//,'').replace(/\//g,'-'),
          url: $this.attr('href'),
          // Cleanup description per http://drupal.org/node/1287934
          description: $this.text().replace(/\s*\[.*/, '').replace('dreditor_' , '')
        };
        sources.push(source);
      });
      // Add custom source
      var custom_url = Drupal.storage.load('triage-custom');
      if (custom_url) {
        var source = {
          id: 'triage-custom-content',
          url: custom_url,
          description: '_custom'
        };
        sources.push(source);
      }
      Drupal.dreditor.triage.tabs(sources);
    });
  },

  /**
   * We want to make the list look like the same as on d.o
   *
   * @param $ul
   *   The unorder list of menu items.
   */
  decorateList : function( $ul) {
    $('ul', $ul).hide();
    // Make compatible with d.o indicating child li's
    $ul.find('li').removeClass('collapsed').parents('li').addClass('collapsed');

    $("li.collapsed", $ul).hover(
      function(){
        var $this = $(this);
        $this.removeClass('collapsed').addClass('expanded');
        $this.children('ul:first').css('z-index', 1000).show();
      },
      function(){
        var $this = $(this);
        $this.addClass('collapsed').removeClass('expanded');
        $this.children('ul:first').hide().css('z-index', -1);
      }
    );
  },

  /**
   * Process a d.o. DL tree
   *
   * @param $container
   *   Were to put the result
   * @param $dl
   *   A (valid) DL jquery tree
   * @param level
   *   Indicates the depth within the tree
   */
  parseDefinitionList : function($container, $dl, level) {
    if (typeof level === 'undefined') {
      level = 1;
      $container.addClass('triage-top-level');
    }
    var $ul = $('<ul>').addClass('level-' + level);
    $ul.appendTo($container);
    $dl.children('dt').each(function() {
      // a 'dt' may contain macros: we split on the first '@'
      var $dt = $(this);
      var ts = $dt.text().split('@');
      var commands ='';
      var executableCommands = [];
      var inContext = false;
      if (ts.length) {
        $dt.text(ts.shift());
        if (ts.length) {
          // We have commands so keep them to show on hover
          commands = '@' + ts.join('@');
          // Are we inContext (this is an AND on all oldValues
          var oldGetCount = 0;
          inContext = false;
          $.each(ts, function(index, value) {
            var matches;
            value = '@' + value;
            matches = value.match(Drupal.dreditor.macro.patterns.oldGet);
            if (matches) {
              if (oldGetCount === 0) {
                // First oldGet so potentially inContext
                inContext = true;
                oldGetCount++;
              }
              var field = matches[1];
              var val = matches[2];
              var currentVal = Drupal.dreditor.macro.getCurrent(field);
              if (val !== currentVal) {
                inContext = false;
              }
            }
            else {
              executableCommands.push(value);
            }
          });
        }
      }
      var $dtl = $('<li>');
      if (inContext) {
        $dtl.addClass('triage-in-context active-trail');
      }
      var $action = $('<a class="triage-action">').attr('href', '#');
      $action.data('triage-commands', []);
      $action.appendTo($dtl);
      $('<span class="triage-commands">' + $dt.text() + '</span>').appendTo($action);
      if (commands) {
        $action.attr('title', commands);
        $(executableCommands).each(function(index, value) {
          $action.data('triage-commands').push(value);
        });
      }
      $action.click(function() {
        var $this = $(this);
        var actions = [];
        if (!Drupal.dreditor.triage.bannerInjected) {
          Drupal.dreditor.triage.bannerInjected = true;
          // We reuse the DT text for generating a stock response
          var stockResponse = '[Stock response from <a href="http://drupal.org/node/1120672">Dreditor templates and macros</a>.]';
          actions.push('@comment(' + stockResponse + ')');
        }
        // Grab all actions up the tree
        $this.parents().each(function() {
          var $action = $(this).children('a.triage-action:first');
          var commands = $action.data('triage-commands');
          if (commands) {
            actions = actions.concat(commands);
          }
        });

        Drupal.dreditor.macro.execute(actions);
        //$("#dreditor-triage-list").empty();
        return false;
      });
      $dtl.appendTo( $ul);
      var $dd = $(this).next();
      // Check for a DD with text before a nested DL
      if ($dd.get().length > 0 && $dd.get()[0].tagName === 'DD') {
        var text = $dd.html();
        // Grab all text before an optional DL
        if ($dd.children('dl').length) {
          // TODO: why use html()
          text = text.split(/<dl/).shift();
        }
        // Cleanup <p> and </p>
        text = text.replace(/<p\>/g, "\n").replace(/<\/p\>/g, '');
        // Cleanup pre and post white spaces
        text = text.replace(/^\s*/m, '').replace(/\s*$/m, '');

        if (text.length>0) {
          $action.data('triage-commands').push('@comment(' + text + ')');
        }

        // Follow a potential DL subtree
        $dd.find('dl:first').each(function(){
          var $dl = $(this);
          Drupal.dreditor.triage.parseDefinitionList($dtl, $dl, level+1);
        });
      }
    });
  }
};
