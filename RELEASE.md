# Release standards

Documentation on how Dreditor is released.

## Versioning

We attempt to follow [Semantic Versioning](http://semver.org/) as much as
possible:

Given a version number `MAJOR.MINOR.PATCH`, increment the:

* MAJOR version when you make incompatible API changes,
* MINOR version when you add functionality in a backwards-compatible manner, and
* PATCH version when you make backwards-compatible bug fixes.

Additional labels for pre-release and build metadata are available as extensions to the MAJOR.MINOR.PATCH format.

## Release Process

1. `grunt release` the project. This is very similar to simply running `grunt`,
   however it will increase the `PATCH` version through out the code before
   compiling it and then build the extensions (if you have supplemental commands installed).
    * To create a `MINOR` release, run: `grunt release:minor`
    * To create a `MAJOR` release, run: `grunt release:major`
2. Make a commit with just the version bump. Something like `git commit -m
   'Dreditor vMAJOR.MINOR.PATCH'`.
3. Tag that commit, ensuring that you provide a message so we get an annotated
   tag. Like this: `git tag -m MAJOR.MINOR.PATCH MAJOR.MINOR.PATCH`
4. Push the commit and the tag: `git push --follow-tags`
5. Notify Mark Carver of this tag so he can create the necessary extensions.
