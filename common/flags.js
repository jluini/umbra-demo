// URL flags: read feature/variant toggles from the query string or hash.
// Dependencies: none.
(() => {
"use strict";

const flags = (() => {
  const search = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const get = (name, def = null) => search.get(name) ?? hash.get(name) ?? def;
  return { get };
})();

window.Flags = flags;
})();
