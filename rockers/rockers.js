(() => {
"use strict";

const config = {
  dictionary: {
    actor: "rocker",
    actors: "rockers",
    item: "objeto",
    items: "objetos",
  },
  levels: {},
};

const create = (container) =>
  Actor.create({ container, config: config });

window.Rockers = { create };
})();
