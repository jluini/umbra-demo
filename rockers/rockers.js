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
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: ["alicia", "bob"],
    },
  ],
};

const create = () =>
  Umbra.create({ config: config });

window.Rockers = { create };
})();
