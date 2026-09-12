(() => {
"use strict";

const config = {
  languages: ["en", "es", "pt"],
  translations: {
    en: { actors: "Rockers", items: "Objects" },
    es: { actors: "Rockers", items: "Objetos" },
    pt: {
      actors: "Rockers", items: "Objetos",
      mission: "Missão", startsAt: "Começa às", deadline: "Prazo", clock: "Relógio",
    },
  },
  actors: {
    alicia: { id: "alicia", name: "Alicia", key: 1 },
    bob: { id: "bob", name: "Bob", key: 2 },
    carlos: { id: "carlos", name: "Carlos", key: 3 },
  },
  levels: [
    {
      id: "test",
      name: { en: "Test", es: "Prueba", pt: "Teste" },
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
