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
const ASSET_EXT = "(svg|png|jpe?g|gif|webp)";
// Asset paths inside JS string literals (relative, "./" or "../").
const JS_ASSET_REF = new RegExp('"((?:\\.\\.?/)[^"]+\\.' + ASSET_EXT + ')"', "g");
// Asset paths inside HTML href/src attributes (local relative, not scheme/absolute).
const HTML_ASSET_REF = new RegExp(
  '([\\s])(href|src)="((?!https?:|//|data:|#|/)[^"]+\\.' + ASSET_EXT + ')"',
  "g"
);

const escapeForScript = (js) => js.replace(/<\/script>/gi, "<\\/script>");
const escapeForStyle = (css) => css.replace(/<\/style>/gi, "<\\/style>");

// Resolve a local asset (path relative to the HTML document) into a data URI.
const assetToDataUri = (rel) => {
  const file = path.resolve(uiDir, rel);
  if (!fs.existsSync(file)) {
    console.error("bundle: asset not found: " + rel);
    process.exit(1);
  }
  const mime = ASSET_MIME[path.extname(file).slice(1).toLowerCase()];
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
};

const inlineAssets = (code) =>
  code.replace(JS_ASSET_REF, (match, rel) => `"${assetToDataUri(rel)}"`);

const inlineHtmlAssets = (html) =>
  html.replace(HTML_ASSET_REF, (match, ws, attr, rel) => `${ws}${attr}="${assetToDataUri(rel)}"`);

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

// 2. Inline assets referenced from the HTML itself (e.g. <link rel="icon" href="favicon.svg">).
html = inlineHtmlAssets(html);

// 3. Inline every referenced stylesheet, preserving document order.
html = html.replace(
  /[ \t]*<link rel="stylesheet" href="([^"]+)"\s*\/>\n?/g,
  (match, href) => {
    const file = path.resolve(uiDir, href.split("?")[0]);
    const css = escapeForStyle(fs.readFileSync(file, "utf8"));
    return `<style>\n${css}\n  </style>\n`;
  }
);

// 4. Inline every referenced script (except the skipped ones).
html = html.replace(/[ \t]*<script src="([^"]+)"><\/script>\n?/g, (match, src) => {
  const clean = src.split("?")[0];
  if (SKIP_SCRIPTS.has(clean)) return "";
  const file = path.resolve(uiDir, clean);
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

const htmlAssetLeftovers = html.match(HTML_ASSET_REF);
if (htmlAssetLeftovers) {
  console.error("bundle: local asset references remain in HTML: " + htmlAssetLeftovers.join(", "));
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html);
console.log("bundle: wrote " + path.relative(root, outFile));
