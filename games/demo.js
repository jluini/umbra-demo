(() => {
"use strict";

const avatarSilhouette = (color, hair = null) => {
  const hairColor = hair && hair.color;
  const parts = [
    `<rect width="64" height="64" rx="8" fill="#1a1a2e"/>`,
    `<path d="M14 58a18 18 0 0 1 36 0z" fill="${color}"/>`,
  ];
  if (hair && hair.style === "long") {
    parts.push(`<rect x="18" y="13" width="28" height="33" rx="13" fill="${hairColor}"/>`);
  }
  parts.push(`<circle cx="32" cy="24" r="11" fill="${color}"/>`);
  if (hair) {
    parts.push(`<path d="M21 24a11 11 0 0 1 22 0z" fill="${hairColor}"/>`);
    if (hair.style === "short") {
      parts.push(`<rect x="20.4" y="21" width="2.2" height="5" rx="1.1" fill="${hairColor}"/>`);
      parts.push(`<rect x="41.4" y="21" width="2.2" height="5" rx="1.1" fill="${hairColor}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${parts.join("")}</svg>`;
};

const keyIcon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 56 52">` +
  `<circle cx="20" cy="20" r="11" fill="none" stroke="#e0a458" stroke-width="7"/>` +
  `<line x1="28" y1="28" x2="52" y2="52" stroke="#e0a458" stroke-width="7" stroke-linecap="round"/>` +
  `<line x1="43" y1="43" x2="50" y2="36" stroke="#e0a458" stroke-width="7" stroke-linecap="round"/>` +
  `<line x1="49" y1="49" x2="56" y2="42" stroke="#e0a458" stroke-width="7" stroke-linecap="round"/>` +
  `</svg>`;

const shadeColor = (hex, factor) => {
  const n = parseInt(hex.slice(1), 16);
  const parts = [16, 8, 0].map((shift) => {
    const v = Math.round(((n >> shift) & 255) * factor);
    return Math.min(255, Math.max(0, v)).toString(16).padStart(2, "0");
  });
  return "#" + parts.join("");
};

const potionIcon = (color, dark = shadeColor(color, 0.65)) => {
  const clipId = "potion-" + color.replace("#", "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="13 5 38 54">` +
    `<defs><clipPath id="${clipId}"><circle cx="32" cy="40" r="18"/></clipPath></defs>` +
    `<rect x="27" y="6" width="10" height="8" rx="2" fill="#8a5a2b"/>` +
    `<rect x="28" y="13" width="8" height="10" fill="#c9d3df"/>` +
    `<circle cx="32" cy="40" r="18" fill="#c9d3df"/>` +
    `<g clip-path="url(#${clipId})">` +
    `<path d="M14 40a18 18 0 0 0 36 0z" fill="${color}"/>` +
    `<ellipse cx="32" cy="58" rx="22" ry="12" fill="${dark}"/>` +
    `<ellipse cx="32" cy="40" rx="18" ry="3" fill="#ffffff" opacity="0.25"/>` +
    `</g>` +
    `<circle cx="25" cy="34" r="3" fill="#ffffff" opacity="0.7"/>` +
    `</svg>`;
};

const starCoinIcon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3 3 58 58">` +
  `<circle cx="32" cy="32" r="26" fill="#e0a458" stroke="#b8792e" stroke-width="4"/>` +
  `<circle cx="32" cy="32" r="18" fill="none" stroke="#f2c879" stroke-width="3"/>` +
  `<polygon points="32,19 35.23,27.55 44.36,27.98 37.23,33.70 39.64,42.52 32,37.5 24.36,42.52 26.77,33.70 19.64,27.98 28.77,27.55" fill="#8a5a2b"/>` +
  `</svg>`;

const coinIcon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="6.5 9.5 51 44.5">` +
  `<ellipse cx="32" cy="34" rx="24" ry="19" fill="#6f5420"/>` +
  `<ellipse cx="32" cy="30" rx="24" ry="19" fill="#b28f42"/>` +
  `<ellipse cx="32" cy="30" rx="24" ry="19" fill="none" stroke="#8a6a28" stroke-width="1.5"/>` +
  `<ellipse cx="32" cy="30" rx="18" ry="14" fill="none" stroke="#8a6a28" stroke-width="1" opacity="0.45"/>` +
  `<path d="M35.5 24a7 6 0 1 0 0 12" fill="none" stroke="#6f5420" stroke-width="2.2" stroke-linecap="round"/>` +
  `<line x1="32" y1="22.5" x2="32" y2="37.5" stroke="#6f5420" stroke-width="2.2" stroke-linecap="round"/>` +
  `</svg>`;

const bikeIcon = (accent = "#e94560") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 21 56 35">` +
  `<circle cx="16" cy="44" r="10" fill="none" stroke="#9aa7b8" stroke-width="3"/>` +
  `<circle cx="48" cy="44" r="10" fill="none" stroke="#9aa7b8" stroke-width="3"/>` +
  `<g fill="none" stroke="#d0d6e0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
  `<line x1="16" y1="44" x2="25" y2="28"/>` +
  `<line x1="16" y1="44" x2="30" y2="45"/>` +
  `<line x1="30" y1="45" x2="25" y2="28"/>` +
  `<line x1="25" y1="28" x2="45" y2="27"/>` +
  `<line x1="30" y1="45" x2="45" y2="27"/>` +
  `<line x1="45" y1="27" x2="48" y2="44"/>` +
  `</g>` +
  `<line x1="21" y1="27" x2="29" y2="27" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>` +
  `<line x1="44" y1="27" x2="42" y2="23" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>` +
  `<line x1="37" y1="23" x2="47" y2="23" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>` +
  `</svg>`;

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
        key: { name: "Vault Key" },
        red_potion: { name: "Red Potion" },
        blue_potion: { name: "Blue Potion" },
        yellow_potion: { name: "Yellow Potion" },
        green_potion: { name: "Green Potion" },
        starCoin: { name: "Star Coin" },
        coin: { name: "Coin" },
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
        key: { name: "Llave de la bóveda" },
        red_potion: { name: "Poción roja" },
        blue_potion: { name: "Poción azul" },
        yellow_potion: { name: "Poción amarilla" },
        green_potion: { name: "Poción verde" },
        starCoin: { name: "Moneda con estrella" },
        coin: { name: "Moneda" },
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
        key: { name: "Chave do cofre" },
        red_potion: { name: "Poção vermelha" },
        blue_potion: { name: "Poção azul" },
        yellow_potion: { name: "Poção amarela" },
        green_potion: { name: "Poção verde" },
        starCoin: { name: "Moeda com estrela" },
        coin: { name: "Moeda" },
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
    cider: { id: "cider", avatarString: "🍾" },
    bike: { id: "bike", avatar: bikeIcon(), avatarString: "🚲", /* avatarSize: "2.2rem" */ },
    chocolates: { id: "chocolates", avatarString: "🍫" },
    diamond: { id: "diamond", avatarString: "🔷" },
    key: { id: "key", avatar: keyIcon },
    red_potion: { id: "red_potion", avatar: potionIcon("#c62f4c") },
    blue_potion: { id: "blue_potion", avatar: potionIcon("#3a83ad") },
    yellow_potion: { id: "yellow_potion", avatar: potionIcon("#c9a93a") },
    green_potion: { id: "green_potion", avatar: potionIcon("#558f3c") },
    starCoin: { id: "starCoin", avatar: starCoinIcon },
    coin: { id: "coin", avatar: coinIcon, /* avatarSize: "2.2rem" */ },
  },
  actors: {
    alice: { id: "alice", key: 1, color: "#e94560", avatar: avatarSilhouette("#e94560", /* { style: "long", color: "#7a4a24" } */), avatarUrl: "../games/demo/assets/girl2.svg" },
    bob: { id: "bob", key: 2, color: "#4ea1d3", avatar: avatarSilhouette("#4ea1d3"), avatarUrl: "../games/demo/assets/boy.svg" },
    charles: { id: "charles", key: 3, color: "#e0a458", avatar: avatarSilhouette("#e0a458", /*{ style: "short", color: "#c9a24a" } */), avatarUrl: "../games/demo/assets/male2.svg" },
    dave: { id: "dave", key: 4, color: "#6ab04c", avatar: avatarSilhouette("#6ab04c") },
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
        { id: "alice", location: "alice_house", items: ["coin", "bike", "chocolates"] },
        { id: "bob", location: "alice_house", items: ["red_potion", "blue_potion", "yellow_potion"] },
        { id: "charles", location: "charles_house", items: ["diamond", "green_potion", "cider", "starCoin", "key"] },
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
