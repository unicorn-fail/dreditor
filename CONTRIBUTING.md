# Contributing

Dreditor runs native JavaScript (and [jQuery]) code.  Development and building
of browser extensions is powered by [Node.js] and [Grunt].

## Setup

Setting up a local development environment is simple; it's all automated:

1. Install [Node.js] - ensure to install the bundled Node Package Manager
   ([npm]), too.
1. Install [Grunt] by running the following shell command:

    ```sh
    npm install -g grunt-cli
    ```
1. Confirm that the Grunt CLI is installed and works:

    ```sh
    grunt --version
    ```
1. Clone the Dreditor repository:

    ```sh
    git clone https://github.com/dreditor/dreditor.git
    ```
1. Change into the new repository directory and install all dependencies:

    ```sh
    cd dreditor
    npm install
    grunt install
    ```
1. Start a first Dreditor build by running:

    ```sh
    grunt
    ```

The `Gruntfile.js` in the top-level directory controls the compilation and build
process.

To see a list of available grunt tasks, run:

```sh
$ grunt --help
…
Available tasks
…
           install  Installs dependencies.
           default  Compiles code.
            dev:ff  Compiles code to build a Firefox extension. (see watch:ff)
          watch:ff  Enables real-time development for Firefox.
              test  Runs tests.
         travis-ci  Compiles code and runs tests.
             build  Compiles code and builds all extensions.
      build:chrome  Builds the Chrome extension.
     build:firefox  Builds the Firefox extension.
      build:safari  Builds the Safari extension.
       autoload:ff  Loads the XPI extension into Firefox.
```

For more information about Grunt, see its
[getting started guide](http://gruntjs.com/getting-started).



## Development

All set?  Let's get ready to rumble!

### File Structure

| Directory             | Content
|:--------------------- |:------------------------------------------------
| *Main source code:*   |
| `/src/js/extensions`  | Base components, libraries, and utility functions.
| `/src/js/plugins`     | Individual features split into one file per feature.
| `/src/less`           | [Less](http://lesscss.org) CSS.
| `/tests`              | [QUnit] tests.
| `/templates`          | Templates for building browser extensions. (rarely touched)
| —                     |
| *Build artifacts:*    |
| `/build`              | Code compiled by grunt; e.g., `dreditor.js`
| `/release`            | Fully packaged browser extensions.


### Hacking

#### Just code

1. Create a new topic/feature branch.  
   _Please do not work in the `1.x` branch directly._

1. Start watching file changes:

    ```sh
    $ grunt watch
    ```
1. Write code.  
   _Check the console output for warnings and errors._

1. ~~Write automated tests.~~  
   _Later… see Automated testing chapter below._

1. Build an extension and manually test your changes.  
   _See Manual testing chapter below._

1. Push your branch into your fork and create a pull request.

For debugging use `$.debug()` or globals like `window.console` or `window.alert`.


#### Live testing

Some browsers have built-in support for automatically refreshing an extension
via the command line.

→ Check the _Manual testing_ chapter below to set up your browser.

For example, for Firefox, just simply run this:

```sh
$ grunt watch:ff
```

This will immediately perform an initial build (to simplify switching between
branches), and upon any file change, a new extension is immediately built and
loaded into your browser.

→ Simply reload a page on https://drupal.org/ and your changes are immediately
active!

_(Just reload, no need to force-refresh!)_


### Coding standards

Dreditor mostly follows Drupal's [JavaScript](https://drupal.org/node/172169)
and [CSS](https://drupal.org/node/1886770) coding standards.  Quick summary:

* Two spaces for indentation. No tabs. Use `"\t"` if you need a literal tab
  character in a string.  
  _Exception:_ Markdown uses 4 spaces for indentation for maximum parser
  compatibility.
* No trailing white-space.  
  _Exception:_ Markdown uses 2 trailing spaces to enforce a linebreak.
* Don't go overboard with white-space.
* No more than [one assignment](http://benalman.com/news/2012/05/multiple-var-statements-javascript/)
  per `var` statement.
* Delimit strings with single-quotes `'`, not double-quotes `"`.
* Prefer `if` and `else` over non-obvious `? : ` ternary operators and complex
  `||` or `&&` expressions.
* Comment your code. Place comments _before_ the line of code, _not_ at the
  _end_ of the line.
* **When in doubt, stay consistent.** Follow the conventions you see in the
  existing code.


### Automated testing

When submitting a pull request, [Travis CI] will automatically…

1. Perform an automated build.
1. [JSHint] all code to check for errors.
1. Run [Qunit] tests.

_Work In Progress…_ — More information on [qunit testing] coming soon.



### Feature Branches and Pull Requests

Normally, branches and PRs are created from user-specific forks/repositories.

However, the maintainers MAY create public feature branches in the Dreditor
repository under the following conditions:

1. The code is known to be incomplete and needs more work.

   In this case, a public feature/topic branch in the Dreditor repository
   _explicitly encourages_ co-maintainers to liberally improve the code through
   additional commits.  However:

   Commits MUST NOT be amended and the branch MUST NOT be rebased.  Contributors
   MAY create PRs against the branch.

1. The branch represents a major refactoring/rewrite feature/topic on Dreditor's
   roadmap.

   In this case, the public feature/topic branch exists in order to be developed
   in parallel to the current stable/mainline.  If/when merged into the mainline,
   the merge of the feature/topic branch will denote a new major or minor
   version (e.g., v1 → v2).

   Maintainers and contributors SHOULD create PRs against such major refactoring
   branches, since each change proposal SHOULD be reviewed independently.

   Major feature/topic branches SHOULD have a maintainable scope. Therefore,
   they MAY be [criss-]cross-merged selectively into other major feature/topic
   branches, if necessary.

   Sub-topics of major features/topics MAY be developed in public 'child'
   feature/topic branches, but it is RECOMMENDED to architect and design changes
   in a way to make them work independently to begin with.

In any case, every public feature/topic branch in the Dreditor repository MUST
have a corresponding pull request (or issue) that holds the main discussion.
A public feature/topic branch without a corresponding pull request (or issue)
MAY be deleted without further notice.  A public feature/topic branch SHOULD be
deleted after merging it into the mainline.


## Manual testing

**Note:**

1. Installing a development build of Dreditor will **replace** the extension
   installed from dreditor.org.
1. Whenever loading a custom build into your browser, make sure that you have
   **only one** Dreditor extension enabled at the same time.

### Chrome

1. Go to [`chrome://extensions`](chrome://extensions)
1. Enable _Developer mode_.
1. Click on _Load unpacked extension…_
1. Browse to the `/build/chrome` directory and click `Select`.
1. Manually refresh the extensions page after each code change.

### Firefox

Requires the [Firefox Add-on SDK](https://developer.mozilla.org/en-US/Add-ons/SDK),
which should have been installed by the initial Setup already.

1. Install the [Extension Auto-Installer Add-on](https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/).

1. Ensure that `wget` is installed. (Test with `wget --version`)  

    ```sh
    # OSX
    brew|port install wget
    # Ubuntu
    sudo apt-get install wget
    ```

1. Run: `grunt watch:ff`

Alternatively, to manually load a single build without the autoinstaller:

1. From the _Tools_ menu, choose _Add-ons_.
1. Use the gear menu and choose _Install Add-on From File…_
1. Browse to `/release/firefox` and select the `dreditor.xpi` file.


### Safari

Requires a (free) [Safari Developer Certificate](https://developer.apple.com/register/index.action).

1. Open the _Preferences_ menu, choose the _Advanced_ tab, and enable
   _Show Develop menu in menu bar_.
1. From the _Develop_ menu, choose _Show Extension Builder_.
1. Click the + button in the bottom left corner of the window and choose
   _Add Extension…_
1. Browse to the `/build/dreditor.safariextension` **directory** and click
   _Select_.
1. Assuming a valid Safari Developer Certificate, click the _Install_ button in
   the top right.
    * Upon first use of your Safari Developer Certificate, you will be asked to
      grant access.
1. Click the _Reload_ button in the Extension Builder window after each code
   change.



[jQuery]: http://jquery.com
[Node.js]: http://nodejs.org
[npm]: http://npmjs.org
[Grunt]: http://gruntjs.com
[Less]: http://lesscss.org
[QUnit]: http://qunitjs.com
[Travis CI]: https://travis-ci.org/dreditor/dreditor
[JSHint]: http://www.jshint.com
[qunit testing]: http://jordankasper.com/blog/2013/04/automated-javascript-tests-using-grunt-phantomjs-and-qunit/

