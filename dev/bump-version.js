// Bumps the cache-busting version of code resources in an HTML file.
// Usage: node dev/bump-version.js <path> <version>
//   Updates <script src="..."> and <link rel="stylesheet" href="..."> by
//   setting (or adding) their ?v=<version>. Skips the favicon and other links.
"use strict";

const fs = require("fs");
const path = require("path");

const [argPath, argVersion] = process.argv.slice(2);

if (!argPath || !/^\d+$/.test(argVersion || "")) {
  console.error("error: usage: node dev/bump-version.js <path> <version>");
  process.exit(1);
}

const file = path.resolve(process.cwd(), argPath);
if (!fs.existsSync(file)) {
  console.error("error: file not found: " + argPath);
  process.exit(1);
}

const isLocalUrl = (url) =>
  !/^(https?:)?\/\//.test(url) && !/^(data:|#|\/)/.test(url);

const withVersion = (url, version) => {
  if (/([?&])v=\d+/.test(url)) return url.replace(/([?&])v=\d+/, "$1v=" + version);
  return url + (url.includes("?") ? "&v=" : "?v=") + version;
};

let html = fs.readFileSync(file, "utf8");
let total = 0;
let updated = 0;

const bumpAttr = (tag, attr) => {
  const re = new RegExp("(\\s)" + attr + '="([^"]+)"');
  const match = tag.match(re);
  if (!match || !isLocalUrl(match[2])) return tag;
  total++;
  const next = withVersion(match[2], argVersion);
  if (next === match[2]) return tag;
  updated++;
  return tag.replace(re, "$1" + attr + '="' + next + '"');
};

html = html.replace(/<script\b[^>]*>/g, (tag) => bumpAttr(tag, "src"));
html = html.replace(/<link\b[^>]*>/g, (tag) => {
  if (!/rel="stylesheet"/.test(tag)) return tag;
  return bumpAttr(tag, "href");
});

if (total === 0) {
  console.log("no resources found in " + argPath);
  process.exit(0);
}
if (updated === 0) {
  console.log("already at v=" + argVersion + " (" + total + " resource(s)) in " + argPath);
  process.exit(0);
}
fs.writeFileSync(file, html);
console.log("updated " + updated + " resource(s) (" + total + " total) to v=" + argVersion + " in " + argPath);
