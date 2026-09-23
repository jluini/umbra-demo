// Dependency-free SVG optimizer for bundling.
// Usage: node dev/optimize-svg.js <in.svg> <out.svg> [precision]
//   precision: "none" (default) or an integer number of decimals (e.g. 2, 3).
//
// Always strips comments, <metadata>, editor namespaces/attributes and collapses
// whitespace. Numeric trimming (when requested) uses a zero guard so small
// negative values keep their sign, which also separates adjacent coordinates in
// path data. Fails if the number of numeric tokens in path "d" attributes changes.
"use strict";

const fs = require("fs");
const path = require("path");

const EDITOR_NS = "(inkscape|sodipodi|rdf|cc|dc|ns1)";
const NS_DECL_RE = new RegExp("\\s+xmlns:" + EDITOR_NS + '="[^"]*"', "g");
const NS_ATTR_RE = new RegExp("\\s+" + EDITOR_NS + ':[A-Za-z-]+="[^"]*"', "g");
const NUMBER_RE = /-?(?:\d+\.\d{3,}|\.\d{3,})(?:[eE][-+]?\d+)?/g;
const TOKEN_RE = /-?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;

const strip = (svg) =>
  svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata\s*>/g, "")
    .replace(/<sodipodi:namedview[\s\S]*?\/>/g, "")
    .replace(NS_DECL_RE, "")
    .replace(NS_ATTR_RE, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .replace(/\s+\/>/g, "/>")
    .replace(/\s+>/g, ">")
    .trim();

const trimNumbers = (svg, decimals) => {
  const power = Math.pow(10, decimals);
  return svg.replace(NUMBER_RE, (token) => {
    const value = parseFloat(token);
    if (!isFinite(value)) return token;
    const rounded = Math.round(value * power) / power;
    if (rounded === 0 && value !== 0) return token;
    return String(rounded);
  });
};

const pathTokenCounts = (svg) => {
  const counts = [];
  const re = /\sd="([^"]*)"/g;
  let match;
  while ((match = re.exec(svg))) {
    counts.push((match[1].match(TOKEN_RE) || []).length);
  }
  return counts;
};

const main = () => {
  const [input, output, precisionArg] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node dev/optimize-svg.js <in.svg> <out.svg> [precision]");
    process.exit(2);
  }

  const precision = precisionArg || "none";
  const decimals = precision === "none" ? null : Number(precision);
  if (decimals !== null && (!Number.isInteger(decimals) || decimals < 0)) {
    console.error("optimize-svg: precision must be 'none' or a non-negative integer");
    process.exit(2);
  }

  const source = fs.readFileSync(input, "utf8");
  let result = strip(source);
  if (decimals !== null) result = trimNumbers(result, decimals);

  const before = pathTokenCounts(source);
  const after = pathTokenCounts(result);
  const mismatches = before.filter((n, i) => n !== after[i]).length;
  if (before.length !== after.length || mismatches > 0) {
    console.error(
      "optimize-svg: path token count changed (" +
        before.length +
        " -> " +
        after.length +
        " attrs, " +
        mismatches +
        " mismatches); aborting"
    );
    process.exit(1);
  }

  fs.writeFileSync(output, result);
  const saved = (100 * (1 - result.length / source.length)).toFixed(1);
  console.log(
    path.basename(output) +
      ": " +
      source.length +
      " -> " +
      result.length +
      " B (-" +
      saved +
      "%), precision=" +
      precision
  );
};

main();
