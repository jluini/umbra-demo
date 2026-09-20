// Builds a single self-contained HTML file from modern_ui/.
// Usage: node dev/bundle.js [outFile]
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const uiDir = path.join(root, "modern_ui");
const outDir = path.join(root, "dist");
const outArg = process.argv[2];
const outFile = outArg
  ? path.resolve(outArg)
  : path.join(outDir, "demo.html");

const SKIP_SCRIPTS = new Set(["../games/rockers.js"]);

const ASSET_MIME = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};
const ASSET_REF = /"((?:\.\.?\/)[^"]+\.(svg|png|jpe?g|gif|webp))"/g;

const escapeForScript = (js) => js.replace(/<\/script>/gi, "<\\/script>");
const escapeForStyle = (css) => css.replace(/<\/style>/gi, "<\\/style>");

// Replace local asset references (paths relative to the HTML document) with data URIs.
const inlineAssets = (code) =>
  code.replace(ASSET_REF, (match, rel, ext) => {
    const file = path.resolve(uiDir, rel);
    if (!fs.existsSync(file)) {
      console.error("bundle: asset not found: " + rel);
      process.exit(1);
    }
    const mime = ASSET_MIME[ext.toLowerCase()];
    const data = fs.readFileSync(file).toString("base64");
    return `"data:${mime};base64,${data}"`;
  });

let html = fs.readFileSync(path.join(uiDir, "index.html"), "utf8");

// 1. Replace the inline games registry with the demo-only bundle defaults.
// html = html.replace(
//   /[ \t]*<script>\s*window\.games\s*=[\s\S]*?<\/script>/,
//   [
//     "<script>",
//     '    window.umbraDefaults = { game: "demo", lang: "es" };',
//     "    window.games = { demo: Demo };",
//     "  </script>",
//   ].join("\n")
// );

// 2. Inline the stylesheet.
const css = escapeForStyle(fs.readFileSync(path.join(uiDir, "style.css"), "utf8"));
html = html.replace(
  /[ \t]*<link rel="stylesheet" href="[^"]+"\s*\/>\n?/,
  `<style>\n${css}\n  </style>\n`
);

// 3. Inline every referenced script (except the skipped ones).
html = html.replace(/[ \t]*<script src="([^"]+)"><\/script>\n?/g, (match, src) => {
  if (SKIP_SCRIPTS.has(src)) return "";
  const file = path.resolve(uiDir, src);
  const js = escapeForScript(inlineAssets(fs.readFileSync(file, "utf8")));
  return `<script>\n${js}\n</script>\n`;
});

const leftovers = html.match(/<script\s+src=|<link\s+rel="stylesheet"/g);
if (leftovers) {
  console.error("bundle: external references remain: " + leftovers.join(", "));
  process.exit(1);
}

const assetLeftovers = html.match(/"\.\.?\/[^"]+\.(svg|png|jpe?g|gif|webp)"/g);
if (assetLeftovers) {
  console.error("bundle: local asset references remain: " + assetLeftovers.join(", "));
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html);
console.log("bundle: wrote " + path.relative(root, outFile));
