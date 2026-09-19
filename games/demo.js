(() => {
"use strict";

const config = {
  languages: [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "pt", name: "Português" }
  ],
  translations: {
    en: {
      umbra: {
        actors: "Characters", locations: "Places",
      },
    },
    es: {
      umbra: {
        actors: "Personajes", locations: "Lugares",
      },
    },
    pt: {
      // startsAt: "Começa às", deadline: "Prazo", clock: "Relógio", briefing: "Resumo",
      umbra: {
        tagline: "un motor de juegos basados en decisiones", // TODO: traducir a portugués
        mission: "Missão", actors: "Personagens", locations: "Lugares",
      },
      menu: {
        play: "Jugar", credits: "Créditos", about: "Acerca de", // TODO: traducir a portugués
      },
    },
  },
  items: {
    cider: { id: "cider", name: { en: "Cider", es: "Sidra", pt: "Sidra" } },
    bike: { id: "bike", name: { en: "Bike", es: "Bicicleta", pt: "Bicicleta" } },
    chocolates: { id: "chocolates", name: { en: "Box of Chocolates", es: "Caja de Bombones", pt: "Caixa de Bombons" } },
    diamond: { id: "diamond", name: { en: "Diamond", es: "Diamante", pt: "Diamante" } },
  },
  actors: {
    alice: { id: "alice", key: 1, name: { en: "Alice", es: "Alicia", pt: "Alice" } },
    bob: { id: "bob", key: 2, name: { en: "Bob", es: "Rober", pt: "Beto" } },
    charles: { id: "charles", key: 3, name: { en: "Charles", es: "Carlos", pt: "Carlos" } },
    dave: { id: "dave", key: 4, name: { en: "Dave", es: "David", pt: "Davi" } },
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
        { id: "alice", location: "alice_house", items: ["bike", "chocolates"] },
        { id: "bob", location: "alice_house", items: [] },
        { id: "charles", location: "charles_house", items: ["cider"] },
      ],
      locations: ["alice_house", "charles_house", "market"],
    },
  ],
};

window.Demo = { id: "demo", config };
})();
