var data = require("sdk/self").data;
var pageMod = require("sdk/page-mod");
pageMod.PageMod({
  include: [
    "*.drupal.org",
    "*.dreditor.org",
    "*.devdrupal.org"
  ],
  contentScriptFile: data.url("%PKG.NAME%.js")
});
