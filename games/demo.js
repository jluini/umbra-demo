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
      actors: {
        alice: { name: "Alice" },
        bob: { name: "Bob" },
        charles: { name: "Charles" },
        dave: { name: "Dave" },
      },
      items: {
        cider: { name: "Cider" },
        bike: { name: "Bike" },
        chocolates: { name: "Box of Chocolates" },
        diamond: { name: "Diamond" },
      },
      locations: {
        alice_house: { name: "Alice's House" },
        bob_house: { name: "Bob's House" },
        charles_house: { name: "Charles's House" },
        market: { name: "Market" },
        square: { name: "Square" },
        forest: { name: "Forest" },
      },
      missions: {
        test: {
          name: "Test",
          briefing: "Alice and Bob finished New Year's dinner at Alice's house. They need to buy cider and bring it back before the new year starts.",
        },
      },
    },
    es: {
      umbra: {
        actors: "Personajes", locations: "Lugares",
      },
      actors: {
        alice: { name: "Alicia" },
        bob: { name: "Rober" },
        charles: { name: "Carlos" },
        dave: { name: "David" },
      },
      items: {
        cider: { name: "Sidra" },
        bike: { name: "Bicicleta" },
        chocolates: { name: "Caja de Bombones" },
        diamond: { name: "Diamante" },
      },
      locations: {
        alice_house: { name: "Casa de Alicia" },
        bob_house: { name: "Casa de Rober" },
        charles_house: { name: "Casa de Carlos" },
        market: { name: "Supermercado" },
        square: { name: "Plaza" },
        forest: { name: "Bosque" },
      },
      missions: {
        test: {
          name: "Prueba",
          briefing: "Alicia y Rober terminaron la cena de fin de año en la casa de Alicia. Deben comprar una sidra y traerla a la casa antes de que comience el nuevo año.",
        },
      },
    },
    pt: {
      // startsAt: "Começa às", deadline: "Prazo", clock: "Relógio", briefing: "Resumo",
      umbra: {
        tagline: "um motor de jogos baseados em decisões",
        mission: "Missão", actors: "Personagens", locations: "Lugares",
      },
      menu: {
        play: "Jogar", continue: "Continuar", credits: "Créditos", about: "Sobre",
      },
      actors: {
        alice: { name: "Alice" },
        bob: { name: "Beto" },
        charles: { name: "Carlos" },
        dave: { name: "Davi" },
      },
      items: {
        cider: { name: "Sidra" },
        bike: { name: "Bicicleta" },
        chocolates: { name: "Caixa de Bombons" },
        diamond: { name: "Diamante" },
      },
      locations: {
        alice_house: { name: "Casa da Alice" },
        bob_house: { name: "Casa do Beto" },
        charles_house: { name: "Casa do Carlos" },
        market: { name: "Mercado" },
        square: { name: "Praça" },
        forest: { name: "Floresta" },
      },
      missions: {
        test: {
          name: "Teste",
          briefing: "Alice e o Beto terminaram o jantar de Réveillon na casa da Alice. Precisam comprar sidra e trazer de volta antes do ano novo começar.",
        },
      },
    },
  },
  items: {
    cider: { id: "cider" },
    bike: { id: "bike" },
    chocolates: { id: "chocolates" },
    diamond: { id: "diamond" },
  },
  actors: {
    alice: { id: "alice", key: 1 },
    bob: { id: "bob", key: 2 },
    charles: { id: "charles", key: 3 },
    dave: { id: "dave", key: 4 },
  },
  locations: {
    alice_house: { id: "alice_house" },
    bob_house: { id: "bob_house" },
    charles_house: { id: "charles_house" },
    market: { id: "market" },
    square: { id: "square" },
    forest: { id: "forest" },
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
