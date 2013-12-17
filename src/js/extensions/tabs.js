/**
 * @defgroup User Experience
 * @{
 */

Drupal.dreditor.ux = {
  /**
   * tabs provides a tab widget
   *
   * First create a container
   * Next addTabs
   * Then init
   * Finally bind
   */
  tabs : {
    /**
     * Initialize a container holding tabs.
     *
     * <div class="dreditor-tabs-container">
     *   <div class="dreditor-tabs">
     */
    createTabContainer : function($container) {
      $container.empty();
      var $tabsContainer = $('<div>').addClass('dreditor-tabs-container').appendTo($container);
      $('<div>').addClass('dreditor-tabs').appendTo($tabsContainer).addClass('active');
    },
    /**
     * Create <div class="dreditor-tab-container dreditor-tab-2 active" id="dreditor-triage">
     * @param $container
     *   Container to inject the tabs into
     * @param tabTitle
     *   Title to use for the new tab
     * @param tabID
     *   unique ID for the the tab and class for its content
     */
    addTab : function($container, tabTitle, tabID, content) {
      var $content = $(content);
      var $tabsContainer = $('> .dreditor-tabs-container', $container);
      var $tabs = $('> .dreditor-tabs', $tabsContainer);
      var $tab = $('<div>').addClass('dreditor-tab').appendTo($tabs).attr('id', tabID);
      $('<a>').attr('href','#').html(tabTitle).appendTo($tab);
      var $tabContent = $('<div>').addClass('dreditor-tab-content').appendTo($tabsContainer);
      $tabContent.addClass(tabID);
      $content.appendTo($tabContent);
      // Make last added tab active
      $('> .dreditor-tab', $tabs).removeClass('active');
      $tab.addClass('active');
      $('> .dreditor-tab-content', $tabsContainer).removeClass('active');
      $tabContent.addClass('active');
    },
    /**
     * Initialise all tabcontainers by setting active and add odd for subtabs.
     *
     * A tab container may contain subtabs. Subtabs need a color swap
     * for better UX.
     *
     * We make the top level inactive so it is collapsed. This preserve screen space.
     */
    init : function() {
      $('.dreditor-tabs-container').each(function() {
        var $this = $(this);
        // It this a sub tab container?
        var depth = $this.parents('.dreditor-tabs-container').size();
        var odd = ((depth % 2) == 1);
        if (odd) {
          $this.addClass('odd');
          $('> .dreditor-tabs', $this).addClass('odd');
          $('> .dreditor-tab-content', $this).addClass('odd');
        }
        else {
          $this.removeClass('odd');
          $('> .dreditor-tabs', $this).removeClass('odd');
          $('> .dreditor-tab-content', $this).removeClass('odd');
        }
        // Preserve screenspace
        if (depth == 0) {
          $this.removeClass('active');
          $('> .dreditor-tabs', $this).removeClass('active');
          $('> .dreditor-tabs > .dreditor-tab', $this).removeClass('active');
          $('> .dreditor-tab-content', $this).removeClass('active');
        }
      });
    },
    /**
     * Bind the click event to the tabs.
     *
     * Each tab is connected to its content by mapping it's ID to content class
     */
    bind : function() {
      $('.dreditor-tab > a').click(function(){
        var $tab = $(this).parent();
        var $tabs = $tab.parent();
        var $tabsContainer = $tabs.parent();
        var tabId = $tab.attr('id');
        var $content = $('.dreditor-tab-content.' + tabId, $tabsContainer);
        // We hide current active tab
        if ($tab.hasClass('active')) {
          $tabs.removeClass('active');
          $tab.removeClass('active');
          $content.removeClass('active');
        }
        else {
          $tabs.addClass('active');
          // Only change current level elements
          $('> .dreditor-tab', $tabs).removeClass('active');
          $tab.addClass('active');
          $('> .dreditor-tab-content', $tabsContainer).removeClass('active');
          $content.addClass('active');
        }
        return false;
      });
    }
  }
}

/**
 * @} End of "defgroup User Experience".
 */

