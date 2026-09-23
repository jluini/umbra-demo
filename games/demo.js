(() => {
"use strict";

const avatarSilhouette = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#1a1a2e"/><circle cx="32" cy="24" r="11" fill="${color}"/><path d="M14 58a18 18 0 0 1 36 0z" fill="${color}"/></svg>`;

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
          name: "End of year toast",
          briefing: {
            situation: "Alice and Bob finished New Year's dinner at Alice's house. They need to buy cider and bring it back before the new year starts.",
            goal: "You must get Alice and Bob together at the house, with at least one cider and no one else present, before midnight.",
            hints: {
              relation: "Do not let Charles see Alice and Bob together. There may be trouble and the mission may be lost.",
              marketHours: "Keep in mind that the market will not sell alcoholic drinks after 11 PM.",
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
          name: "Brindis de fin de año",
          briefing: {
            situation: "Alicia y Rober terminaron la cena de fin de año en la casa de Alicia. Deben comprar una sidra y traerla a la casa antes de que comience el nuevo año.",
            goal: "Debes lograr que Alicia y Rober estén juntos en la casa, con al menos una sidra y sin ningún otro acompañante antes de las doce de la noche.",
            hints: {
              relation: "No permitas que Carlos vea a Alicia y a Rober juntos. Puede haber problemas y darse por perdida la misión.",
              marketHours: "Tené presente que el supermercado no venderá bebidas alcohólicas después de las 23hs.",
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
      briefingLabels: {
        goal: "Objetivo",
        hints: "Dicas"
      },
      plan: {
        walkTo: "Caminhar até...",
        cancel: "Cancelar",
        inTransit: "Em trânsito"
      },
      actions: {
        play: "Jogar"
      },
      missions: {
        test: {
          name: "Brinde de fim de ano",
          briefing: {
            situation: "Alice e o Beto terminaram o jantar de Réveillon na casa da Alice. Precisam comprar sidra e trazer de volta antes do ano novo começar.",
            goal: "Você deve conseguir que Alice e o Beto fiquem juntos na casa, com pelo menos uma sidra e sem mais ninguém, antes da meia-noite.",
            hints: {
              relation: "Não deixe que Carlos veja Alice e o Beto juntos. Pode haver problemas e a missão pode ser dada como perdida.",
              marketHours: "Lembre-se de que o mercado não venderá bebidas alcoólicas depois das 23h.",
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
    alice: { id: "alice", key: 1, color: "#e94560", avatar: avatarSilhouette("#e94560") },
    bob: { id: "bob", key: 2, color: "#4ea1d3", avatar: avatarSilhouette("#4ea1d3") },
    charles: { id: "charles", key: 3, color: "#e0a458", avatar: avatarSilhouette("#e0a458") },
    dave: { id: "dave", key: 4, color: "#6ab04c" },
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
        { label: "briefingLabels.goal", text: ".goal" },
        { label: "briefingLabels.hints", entries: [".hints.relation", ".hints.marketHours", ".hints.chocolates"] }
      ]
    },
  ],
};

window.Demo = { id: "demo", config };
})();
