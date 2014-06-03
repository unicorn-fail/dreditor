# Release standards and procedures

## Versioning

Dreditor follows the [Semantic Versioning](http://semver.org/) standard.

Given a version number `MAJOR.MINOR.PATCH`, increment the:

* MAJOR version when the new release contains incompatible API changes.

  ```diff
  -1.2.5
  +2.0.0
  ```
* MINOR version when the new release adds new functionality in a
  backwards-compatible manner.

  ```diff
  -1.2.5
  +1.3.0
  ```
* PATCH version when the new release contains backwards-compatible bug fixes.

  ```diff
  -1.2.5
  +1.2.6
  ```

Additional suffixes for pre-releases or build numbers may be appended, separated
by a dash/hyphen.

## Release Process

Examples assume that:
* Current version is `1.2.5` and new version is `1.2.6`.
* `origin` refers to [dreditor/dreditor]

1. Ensure that you have the latest code and HEAD is clean:

    ```sh
    $ git checkout 1.x
    $ git reset --hard
    $ git pull origin 1.x
    ```

1. Confirm that Dreditor works correctly:

    ```sh
    $ grunt build
    $ grunt test
    ```

1. Increase the version number:

    ```sh
    $ grunt release
    ```

    This bumps the PATCH version in `package.json`. Alternatively:

    * To bump the MINOR version: `grunt release:minor`
    * To bump the MAJOR version: `grunt release:major`

    ```diff
    $ git diff
    diff --git a/package.json b/package.json
    index 2432958..1a299ec 100644
    --- a/package.json
    +++ b/package.json
    @@ -5 +5 @@
    -  "version": "1.2.5",
    +  "version": "1.2.6",
    ```

1. Commit the version change:

    ```sh
    $ git add package.json
    $ git commit -m "Dreditor 1.2.6"
    ```

1. Create an annotated tag for the release:

    ```sh
    $ git tag -m 1.2.6 1.2.6
    ```

1. Push the new version commit and tag:

    ```sh
    $ git push origin 1.x --tags
    ```

1. Verify that the new release and all builds appear on the [build page].

1. Test whether the new release installs and works correctly in each browser.

All performed operations up till here can be reverted in case something went
wrong.

## Publishing releases

Proceed with publishing the newly built extensions.

Examples assume that:
* Current version is `1.2.5` and new version is `1.2.6`.
* `origin` refers to [dreditor/dreditor.org]


### Chrome

1. Download the packaged Chrome extension from the [build page].

1. Go to https://chrome.google.com/webstore/developer/dashboard

1. Click the _Edit_ operation link for _Dreditor_.

1. Click the _Upload Updated Package_ button + upload the downloaded package.

1. Click the _Publish changes_ button at the bottom.

### Firefox and Safari

1. Change to your local clone of [dreditor/dreditor.org].

1. Ensure that you have the latest code and HEAD is clean:

    ```sh
    $ git checkout 7.x
    $ git reset --hard
    $ git pull origin 7.x
    ```

1. Download the packaged extension for each browser from the [build page] and
   replace the corresponding `dreditor.*` file in the root directory.

1. Edit the `update.plist` file in the root directory to replace the version
   with the new version.

    ```diff
    $ git diff
    diff --git a/dreditor.safariextz b/dreditor.safariextz
    index 2e8dd2d..ee6524f 100644
    Binary files a/dreditor.safariextz and b/dreditor.safariextz differ
    diff --git a/dreditor.xpi b/dreditor.xpi
    index 742cdf1..0e6542e 100644
    Binary files a/dreditor.xpi and b/dreditor.xpi differ
    diff --git a/update.plist b/update.plist
    index 9d040be..f1b51b5 100644
    --- a/update.plist
    +++ b/update.plist
    @@ -12,5 +12,5 @@
            <key>CFBundleVersion</key>
    -       <string>1.2.5</string>
    +       <string>1.2.6</string>
            <key>CFBundleShortVersionString</key>
    -       <string>1.2.5</string>
    +       <string>1.2.6</string>
            <key>URL</key>
    ```

1. Commit and push the new releases to [dreditor/dreditor.org]:

    ```sh
    $ git add -u
    $ git commit -m "Dreditor 1.2.6"
    $ git push origin 7.x
    ```

1. Deploy changes on the server:

    ```sh
    $ sudo su
    $ cd /var/www/sites/dreditor.org
    $ git pull
    ```


[build page]: https://dreditor.org/development/build#tags
[dreditor/dreditor]: https://github.com/dreditor/dreditor
[dreditor/dreditor.org]: https://github.com/dreditor/dreditor.org
