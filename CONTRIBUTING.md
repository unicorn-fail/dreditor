# Contributing

## Directory structure

The following directories are important for developing and submitting pull requests:

- `src/js` : dreditor code split into smaller parts like extensions and plugins
- `src/less` : dreditor styling files.
- `package.json` : contains version number apart from others
- `tests/` : contains unit tests
- `build/` : contains generated items by running `grunt`. See Developer workflow below.

The following directories are important for distributing Dreditor:

- `templates/` : used for generating the browser extensions
- `release/` : contains the generated packages Dreditor browser extensions.

Both `build/` and `release/` are added to `.gitignore` so make sure these are not added to any PR.

## Developer workflow

### Modifying the code

1. Make sure you have Grunt configured correctly as described below.
1. Run `grunt watch` to continues rebuild your changes into the build directory or just `grunt` when ready
1. Configure your browser to use the correct build as described below.
1. Start coding by
  1. Create a (new) feature branch. Please don't work in the `1.x` branch directly.
  1. Fix the code. When debugging use `$.debug()` or 'globals' like `window.console` and `window.alert`.
  1. Write a test for the new code
  1. Check the watched output for failing tasks like jslint or tests.
1. Run `grunt` to ensure code compiles properly. Assuming that you don't see any red, you're ready to go.
1. Update the documentation to reflect any changes.
1. Push to your fork's new branch and submit a pull request.

### Code style

Regarding code style like indentation and whitespace, **follow the conventions you see used in the source already.**

### Writing tests

The `tests/` directory contains *.html files with are configured to belong to the test and qunit tasks.

More information coming soon.

[grunt and qunit](http://jordankasper.com/blog/2013/04/automated-javascript-tests-using-grunt-phantomjs-and-qunit/)

## Configure your browser

### Chrome

Make sure you only have one version of the Dreditor extension enabled at one time.

1. Navigate to `chrome://extensions`.
1. Enable Developer mode if you haven't already.
1. Click on `Load unpacked extension...`.
1. Browse to the `build/chrome` directory and click `Select`.
1. Make sure you refresh the extensions page after each code change.

### Firefox

Note that installing a development version of Dreditor will replace a copy of the Add-on installed from dreditor.org.

**Requirements**

1. The [Firefox Add-on SDK](https://developer.mozilla.org/en-US/Add-ons/SDK) must be installed, run `grunt mozilla-addon-sdk`.
1. The [Extension Auto-Installer Add-on](https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/) Firefox add-on must be installed. This extension requires the `wget` command to be installed (for OSX, `brew|port install wget`).

After all requirements have been met, a Firefox extension will be built and auto-loaded by running one of the following commands:
* `grunt build:firefox`
* `grunt dev`
* `grunt watch:dev`
* `grunt build` (also builds chrome and safari)

If, for whatever reason, the Firefox extension has not automatically loaded in Firefox you may manually install `release/dreditor-<version>.xpi`. From the `Tools` menu, choose `Add-ons` and drag the .xpi file in or use the gear menu and choose `Install Add-on From File…` and browse to the .xpi file and click `Select`.

### Safari

You'll need a [Safari Developer Certificate](https://developer.apple.com/register/index.action) (free) in order to build/install the Safari extension. Make sure you only have one version of the Dreditor extension enabled at one time.

1. Enable the `Develop` menu. Open Preferences in the Safari menu, choose the Advanced tab, and check the box marked `Show Develop menu in menu bar`.
1. From the `Develop` menu, choose `Show Extension Builder`. Click the Plus button in the bottom left corner of the window and choose `Add Extension…`.
1. Browser to the `build/dreditor.safariextension` directory and click `Select`.
1. Once the extension has been loaded and assuming you have set up a Safari Developer Certificate, you should see an `Install` button on the top right. If this is the first time using your Safari Developer Certificate you will be asked to grant access.
1. Make sure you click the `Reload` button in the Extension Builder window after each code change.

## Grunt

Grunt helps to continuously test our code and build the browser packages.

First, ensure that you have the latest [Node.js](http://nodejs.org/) and [npm](http://npmjs.org/) installed.

Test that Grunt's CLI is installed by running `grunt --version`.  If the command isn't found, run `npm install -g grunt-cli`.  For more information about installing Grunt, see the [getting started guide](http://gruntjs.com/getting-started).

1. Fork and clone the repo.
1. Run `npm install` to install all dependencies (including Grunt).
1. Run `grunt` to grunt this project.
