var fs = require("fs")
var inlineAssets = require("inline-assets")
var content = fs.readFileSync("public/index.html", "utf8")
content = inlineAssets("index.html", "public/index.html", content, {
    verbose: false,
    htmlmin: false,
    cssmin:  false,
    jsmin:   false,
    pattern: [ ".+" ],
    purge:   false
})
fs.writeFileSync("index.html", content, "utf8")
