Drupal = Drupal || {};
Drupal.dreditor = Drupal.dreditor || {};

Drupal.dreditor.issue = {
  /**
   * List of values available on issue view or edit page.
   *
   * @type object
   */
  fields : {
    title : {
      id : "edit-title",
      get: "#page-subtitle",
      type : 'text'
    },
    status : {
      label : 'Status:',
      get: '#block-project-issue-issue-metadata .field-name-field-issue-status .field-items',
      id : "edit-sid",
      type : 'select'
    },
    project_title : {
      label : 'Project:',
      get : '#block-project-issue-issue-metadata .field-name-field-project .field-items ',
      id : "edit-project-info-project-title",
      type : 'text',
      hasAjax : true,
      setFocus: "edit-title"
    },
    version : {
      label : 'Version:',
      get : '#block-project-issue-issue-metadata .field-name-field-issue-version .field-items ',
      id : "edit-project-info-rid",
      type : 'select'
    },
    component : {
      label : 'Component:',
      get : '#block-project-issue-issue-metadata .field-name-field-issue-component .field-items ',
      id : 'edit-project-info-component',
      type : 'select'
    },
    priority : {
      label : 'Priority:',
      get : '#block-project-issue-issue-metadata .field-name-field-issue-priority .field-items ',
      id : "edit-priority",
      type : 'select'
    },
    category : {
      label : 'Category:',
      get : '#block-project-issue-issue-metadata .field-name-field-issue-category .field-items ',
      id : "edit-category",
      type : 'select'
    },
    assigned : {
      label : 'Assigned:',
      get : '#block-project-issue-issue-metadata .field-name-field-issue-assigned .field-items ',
      id : "edit-project-info-assigned",
      type : 'select'
    },
    tags : {
      label : 'Tags:',
      get: '#block-project-issue-issue-metadata .field-name-taxonomy-vocabulary-9 .field-items .field-item',
      id : "edit-taxonomy-tags-9",
      type : 'tags'
    },
    comment : {
      id : "edit-comment-body-und-0-value, #edit-nodechanges-comment-body-value",
      type : 'textarea'
    }
  },
  /**
   * The current issue values are presented at the top of an issue
   *
   * The values are themed into a table id=project-issue-summary-table
   *
   * Each row has two column
   * - first having the label listed above in the fields
   * - next having the current issue status value
   */
  getCurrent : function (oldName) {
    var name = oldName.replace(/^old/, '').toLowerCase();
    var f = Drupal.dreditor.issue.fields[name];
    if (typeof f !== 'undefined') {
      if (typeof f.label !== 'undefined') {
        var value = [];
        $(f.get).each(function(){
          value.push($(this).text());
        });
        return value.join(', ');
      }
    }
    return '';
  },
};

/**
 * Gets the issue node id.
 */
Drupal.dreditor.issue.getNid = function() {
  var href = $('#tabs a:first').attr('href');
  if (href.length) {
    return href.match(/(?:node|comment\/reply)\/(\d+)/)[1];
  }
  return false;
};

/**
 * Returns the next comment number for the current issue.
 */
Drupal.dreditor.issue.getNewCommentNumber = function() {
  // Get comment count.
  var lastCommentNumber = $('.comments .comment:last .permalink').text().match(/\d+$/);
  return (lastCommentNumber ? parseInt(lastCommentNumber[0], 10) : 0) + 1;
};

/**
 * Gets the issue title.
 */
Drupal.dreditor.issue.getIssueTitle = function() {
  var title = $('#page-subtitle').text() || '';
  return title;
};

/**
 * Gets the project shortname.
 *
 * @return
 *   Return false when using the preview mode since the breadcrumb is not
 *   included in the preview mode.
 */
Drupal.dreditor.issue.getProjectShortName = function() {

  // Retreive project from breadcrumb.
  var project = $('.breadcrumb a:eq(0)').attr('href');

  // @todo The comment preview page does not contain a breadcrumb and also
  //   does not expose the project name anywhere else.
  if (project) {
    // The Drupal (core) project breadcrumb does not contain a project page link.
    if (project === '/project/issues/drupal') {
      project = 'drupal';
    }
    else {
      project = project.substr(9);
    }
  }
  else {
    project = false;
  }

  return project;
};

Drupal.dreditor.issue.getSelectedComponent = function() {
  // Retrieve component from the comment form selected option label.
  var version = $(':input[name*="issue_component"] :selected').text();
  return version;
};

/**
 * Gets the selected version.
 *
 * Variations:
 *   7.x
 *   7.x-dev
 *   7.x-alpha1
 *   7.20
 *   7.x-1.x
 *   7.x-1.12
 *   7.x-1.x
 *   - 8.x issues -
 *   - Any -
 *   All-versions-4.x-dev
 */
Drupal.dreditor.issue.getSelectedVersion = function() {
  // Retrieve version from the comment form selected option label.
  return Drupal.dreditor.issue.getCurrent('version');
};

/**
 * Gets the selected core version.
 *
 * Variations:
 *   7.x
 *   7.20
 */
Drupal.dreditor.issue.getSelectedVersionCore = function() {
  var version = Drupal.dreditor.issue.getSelectedVersion();
  var matches = version.match(/^(\d+\.[x\d]+)/);
  if (matches) {
    return matches[0];
  }
  else {
    return false;
  }
};

/**
 * Gets the selected contrib version.
 *
 * Variations:
 *   1.x
 *   1.2
 */
Drupal.dreditor.issue.getSelectedVersionContrib = function() {
  var version = Drupal.dreditor.issue.getSelectedVersion();
  var matches = version.match(/^\d+\.x-(\d+\.[x\d]+)/);
  if (matches) {
    return matches[1];
  }
  else {
    return false;
  }
};

/**
 * Gets the selected core + contrib version.
 *
 * Variations:
 *   7.x-1.x
 *   7.x-1.2
 */
Drupal.dreditor.issue.getSelectedVersionCoreContrib = function() {
  var version = Drupal.dreditor.issue.getSelectedVersion();
  var matches = version.match(/^(\d+\.x-\d+\.[x\d]+)/);
  if (matches) {
    return matches[0];
  }
  else {
    return false;
  }
};
