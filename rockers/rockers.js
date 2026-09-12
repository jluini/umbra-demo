(() => {
"use strict";

const config = {
  dictionary: {
    actor: "rocker",
    actors: "rockers",
    item: "objeto",
    items: "objetos",
  },
  actors: {
    alicia: { id: "alicia", name: "Alicia", key: 1 },
    bob: { id: "bob", name: "Bob", key: 2 },
    carlos: { id: "carlos", name: "Carlos", key: 3 },
  },
  levels: [
    {
      id: "test",
      name: "Test",
      actors: ["alicia", "bob"],
    },
  ],
};

const create = (container) =>
  Umbra.create({ container, config: config });

window.Rockers = { create };
})();
