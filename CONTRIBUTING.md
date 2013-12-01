# Contributing

We changed development workflow by using the grunt toolset. This meant splitting up the dreditor.js file into several parts to make better use of extentions and plugins. This allows us to add unit tests later on.

## Important notes

1. You'll find source code in the `src` directory.
1. When `grunt`-ing this project, it will generate an additional `build` and possibly a `release` directory. These have both been added to `.gitignore` and should never be included with any pull requests.
1. To continuously build a packaged version Dreditor, you can run `grunt watch` in root of the project. It will automatically detect changes made to any file and compile the source code for you.

### Code style
Regarding code style like indentation and whitespace, **follow the conventions you see used in the source already.**

## Modifying the code
First, ensure that you have the latest [Node.js](http://nodejs.org/) and [npm](http://npmjs.org/) installed.

Test that Grunt's CLI is installed by running `grunt --version`.  If the command isn't found, run `npm install -g grunt-cli`.  For more information about installing Grunt, see the [getting started guide](http://gruntjs.com/getting-started).

1. Fork and clone the repo.
1. Run `npm install` to install all dependencies (including Grunt).
1. Run `grunt` to grunt this project.

Assuming that you don't see any red, you're ready to go. Just be sure to run `grunt` after making any changes, to ensure that nothing is broken. You can also run `grunt watch` to watch to automatically detect when changes to files have been made.

## Submitting pull requests

1. Create a new branch, please don't work in the `1.x` branch directly.
2. Fix existing or add new code.
3. Run `grunt` to ensure code compiles properly.
4. Update the documentation to reflect any changes.
5. Push to your fork's new branch and submit a pull request.

## Writing tests

[grunt and qunit](http://jordankasper.com/blog/2013/04/automated-javascript-tests-using-grunt-phantomjs-and-qunit/)

