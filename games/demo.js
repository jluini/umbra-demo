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
          briefing: {
            situation: "Alice and Bob finished New Year's dinner at Alice's house. They need to buy cider and bring it back before the new year starts.",
            goal: "You must get Alice and Bob together at the house, with at least one cider and no one else present, before midnight.",
            hints: {
              relation: "Do not let Charles see Alice and Bob together. There may be trouble and the mission may be lost.",
              market_hours: "Keep in mind that the market will not sell alcoholic drinks after 11 PM.",
              chocolates: "Charles has a cider and may agree to hand it over in exchange for a box of chocolates.",
            },
          }
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
          briefing: {
            situation: "Alicia y Rober terminaron la cena de fin de año en la casa de Alicia. Deben comprar una sidra y traerla a la casa antes de que comience el nuevo año.",
            goal: "Debes lograr que Alicia y Rober estén juntos en la casa, con al menos una sidra y sin ningún otro acompañante antes de las doce de la noche.",
            hints: {
              relation: "No permitas que Carlos vea a Alicia y a Rober juntos. Puede haber problemas y darse por perdida la misión.",
              market_hours: "Tené presente que el supermercado no venderá bebidas alcohólicas después de las 23hs.",
              chocolates: "Carlos tiene una sidra y es posible que acepte ofrecerla a cambio de una caja de bombones.",
            },
          },
        },
      },
    },
    pt: {
      // startsAt: "Começa às", deadline: "Prazo", clock: "Relógio", briefing: "Resumo",
      umbra: {
        tagline: "um motor de jogos baseados em decisões",
        mission: "Missão", actors: "Personagens", items: "Objetos", locations: "Lugares",
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
      briefing_labels: {
        goal: "Objetivo",
        hints: "Dicas"
      },
      missions: {
        test: {
          name: "Teste",
          briefing: {
            situation: "Alice e o Beto terminaram o jantar de Réveillon na casa da Alice. Precisam comprar sidra e trazer de volta antes do ano novo começar.",
            goal: "Você deve conseguir que Alice e o Beto fiquem juntos na casa, com pelo menos uma sidra e sem mais ninguém, antes da meia-noite.",
            hints: {
              relation: "Não deixe que Carlos veja Alice e o Beto juntos. Pode haver problemas e a missão pode ser dada como perdida.",
              market_hours: "Lembre-se de que o mercado não venderá bebidas alcoólicas depois das 23h.",
              chocolates: "Carlos tem uma sidra e pode aceitar trocá-la por uma caixa de bombons.",
            },
          },
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
  missions: [
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
      briefing: [
        { text: ".situation" },
        { label: "briefing_labels.goal", text: ".goal" },
        { label: "briefing_labels.hints", entries: [".hints.relation", ".hints.market_hours", ".hints.chocolates"] }
      ]
    },
  ],
};

window.Demo = { id: "demo", config };
})();
