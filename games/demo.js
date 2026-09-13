(() => {
"use strict";

const config = {
  languages: ["en", "es", "pt"],
  translations: {
    en: { actors: "Characters", locations: "Places", alice: "Alice", bob: "Bob", charles: "Charles" },
    es: { actors: "Personajes", locations: "Lugares", alice: "Alicia", bob: "Rober", charles: "Carlos" },
    pt: {
      actors: "Personagens", locations: "Lugares",
      mission: "Missão", startsAt: "Começa às", deadline: "Prazo", clock: "Relógio", briefing: "Resumo",
      alice: "Alice", bob: "Beto", charles: "Carlos",
    },
  },
  actors: {
    alice: { id: "alice", key: 1 },
    bob: { id: "bob", key: 2 },
    charles: { id: "charles", key: 3 },
  },
  locations: {
    alice_house: { id: "alice_house", name: { en: "Alice's House", es: "Casa de Alicia", pt: "Casa da Alice" } },
    bob_house: { id: "bob_house", name: { en: "Bob's House", es: "Casa de Rober", pt: "Casa do Beto" } },
    charles_house: { id: "charles_house", name: { en: "Charles's House", es: "Casa de Carlos", pt: "Casa do Carlos" } },
    market: { id: "market", name: { en: "Market", es: "Supermercado", pt: "Mercado" } },
    square: { id: "square", name: { en: "Square", es: "Plaza", pt: "Praça" } },
    forest: { id: "forest", name: { en: "Forest", es: "Bosque", pt: "Floresta" } },
  },
  routes: [
    { from: "alice_house", to: "square", distance: 1 },
    { from: "bob_house", to: "square", distance: 1.2 },
    { from: "charles_house", to: "square", distance: 1.4 },
    { from: "square", to: "market", distance: 0.5 },
  ],
  levels: [
    {
      id: "test",
      name: { en: "Test", es: "Prueba", pt: "Teste" },
      briefing: {
        en: "Alice and Bob finished New Year's dinner at Alice's house. They need to buy cider and bring it back before the new year starts.",
        es: "Alicia y Rober terminaron la cena de fin de año en la casa de Alicia. Deben comprar una sidra y traerla a la casa antes de que comience el nuevo año.",
        pt: "Alice e o Beto terminaram o jantar de Réveillon na casa da Alice. Precisam comprar sidra e trazer de volta antes do ano novo começar.",
      },
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: [
        { id: "alice", location: "alice_house" },
        { id: "bob", location: "alice_house" },
      ],
      locations: ["alice_house", "market"],
    },
  ],
};

const create = () =>
  Umbra.create({ config: config });

window.Demo = { create };
})();
