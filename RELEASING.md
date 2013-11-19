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

Ultimately this will be automated in the future. However, for now, follow these
steps to ensure we create a solid release:

1. Bump the version, which is in `dreditor.user.js` on lines `8` and `137`.
2. Make a commit with just the version bump. Something like `git commit -m
   'Dreditor vMAJOR.MINOR.PATCH'`.
3. Tag that commit, ensuring that you provide a message so we get an annotated
   tag. Like this: `git tag -m vMAJOR.MINOR.PATCH vMAJOR.MINOR.PATCH`
4. Push the commit and the tag: `git push --follow-tags`
5. Notify Mark Carver of this tag so he can create the Chrome and Safari
   browser extensions.
