// Base, DOM-free utilities.
// Dependencies: none.
(() => {
"use strict";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const deepMerge = (base, override) => {
  const out = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    out[key] = isPlainObject(out[key]) && isPlainObject(value)
      ? deepMerge(out[key], value)
      : value;
  }
  return out;
};

const getPath = (obj, path) => {
  let node = obj;
  for (const part of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return node;
};

const buildKey = (type, id, field = "name") => type + "." + id + "." + field;

const resolveKey = (path, base = "") =>
  path && path.startsWith(".") ? base + path : path;

window.Utils = window.Utils || {};
// window.Utils.isPlainObject = isPlainObject;
window.Utils.deepMerge = deepMerge;
window.Utils.getPath = getPath;
window.Utils.buildKey = buildKey;
window.Utils.resolveKey = resolveKey;
})();
