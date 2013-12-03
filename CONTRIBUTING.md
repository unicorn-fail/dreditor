# Contributing

## Important notes

As of version > 1.2.3 (Nov 30 2013) we introduced a new source tree layout and developer workflow by using the grunt toolset. This meant splitting up the dreditor.js file into several parts to make better use of extentions and plugins. This allows us to add unit tests later on.

## Directory structure

The following directories are important for patch writing:

src/js : dreditor code split into smaller parts like extensions and plugins
src/less : dreditor styling files.
package.json : contains version number apart from others
tests/ : contains unit tests
build/ : contains generated items by running ```grunt```. See Developer workflow below.

The following directories are important for distributing Dreditor:

templates/ : used for generating the browser extensions
release/ : contains the generated packages Dreditor browser extensions.
build/ : see above

Both build/ and release/ are added to ```.gitignore``` so make sure these are not added to any PR.

## Developer workflow

### Modifying the code

1. Make sure you have Grunt configured correctly as described below.
1. Run ```grunt watch``` to continues rebuild your changes into the build directory or just ```grunt``` when ready
1. Configure your browser to use the correct build as described below.
1. Start coding by
  1. Create a (new) feature branch. Please don't work in the `1.x` branch directly.
  1. Fix the code
  1. Write a test for the new code
  1. Check the watched output for failing tasks like jslint or tests.
1. Run `grunt` to ensure code compiles properly. Assuming that you don't see any red, you're ready to go.
1. Update the documentation to reflect any changes.
1. Push to your fork's new branch and submit a pull request.

### Code style

Regarding code style like indentation and whitespace, **follow the conventions you see used in the source already.**

### Writing tests

The ```tests/``` directory contains *.html files with are configured to belong to the test and qunit tasks.

More information coming soon.

[grunt and qunit](http://jordankasper.com/blog/2013/04/automated-javascript-tests-using-grunt-phantomjs-and-qunit/)

# Configure your browser

## Chrome

1. Navigate to ```chrome://extensions/```
1. Click on ```Load unpacked extention...```
1. Browser to the ```build/chrome``` directory and click ```Select```

## Firefox

(to be defined)

## Safari

(to be defined)

# Grunt

First, ensure that you have the latest [Node.js](http://nodejs.org/) and [npm](http://npmjs.org/) installed.

Test that Grunt's CLI is installed by running `grunt --version`.  If the command isn't found, run `npm install -g grunt-cli`.  For more information about installing Grunt, see the [getting started guide](http://gruntjs.com/getting-started).

1. Fork and clone the repo.
1. Run `npm install` to install all dependencies (including Grunt).
1. Run `grunt` to grunt this project.
