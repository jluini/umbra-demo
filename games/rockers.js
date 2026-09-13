(() => {
"use strict";

const config = {
  languages: ["en", "es"],
  translations: {
    en: { actors: "Rockers", items: "Objects", alicia: "Alice", bob: "Bob", carlos: "Charles" },
    es: { actors: "Rockers", items: "Objetos", alicia: "Alicia", bob: "Rober", carlos: "Carlos" },
  },
  actors: {
    alicia: { id: "alicia", key: 1 },
    bob: { id: "bob", key: 2 },
    carlos: { id: "carlos", key: 3 },
  },
  levels: [
    {
      id: "test",
      name: { en: "Test", es: "Prueba", pt: "Teste" },
      briefing: {
        en: "Alice and Bob finished New Year's dinner at Alicia's house. They need to buy cider and bring it back before the new year starts.",
        es: "Alicia y Rober terminaron la cena de fin de año en la casa de Alicia. Deben comprar una sidra y traerla a la casa antes de que comience el nuevo año.",
        pt: "Alice e o Beto terminaram o jantar de Réveillon na casa da Alice. Precisam comprar sidra e trazer de volta antes do ano novo começar.",
      },
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: ["alicia", "bob"],
    },
  ],
};

const create = () => {
  throw new Error("rockers: not implemented yet");
};

window.Rockers = { create };
})();
