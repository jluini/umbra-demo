(() => {
"use strict";

// Dependencies: games/demo/icons.js (window.DemoIcons).
const {
  avatarSilhouette,
  keyIcon,
  potionIcon,
  starCoinIcon,
  coinIcon,
  bikeIcon,
} = window.DemoIcons;

const config = {
  languages: ["en", "es", "pt"],
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
        elena: { name: "Elena" },
        fiona: { name: "Fiona" },
        george: { name: "George" },
      },
      items: {
        cider: { name: "Cider" },
        bike: { name: "Bike" },
        chocolates: { name: "Box of Chocolates" },
        diamond: { name: "Diamond" },
        key: { name: "Vault Key" },
        redPotion: { name: "Red Potion" },
        bluePotion: { name: "Blue Potion" },
        yellowPotion: { name: "Yellow Potion" },
        greenPotion: { name: "Green Potion" },
        starCoin: { name: "Star Coin" },
        coin: { name: "Coin" },
      },
      locations: {
        aliceHouse: { name: "Alice's House" },
        bobHouse: { name: "Bob's House" },
        charlesHouse: { name: "Charles's House" },
        market: { name: "Market" },
        square: { name: "Square" },
        forest: { name: "Forest" },
      },
      missions: {
        test: {
          name: "End of year toast",
          victory: "Alice and Bob got the cider; now they can celebrate the arrival of 2025.",
          defeat: "Charles found out Alice and Bob are together. The night ended badly.",
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
        test2: {
          name: "The Potion Contest",
          victory: "Elena and Fiona crowned Alice and Bob winners of the potion contest.",
          briefing: {
            situation: "Elena and Fiona are hosting a potion contest in the square. Alice and Bob promised to bring the red potion, but George accidentally left the recipe at Bob's house. Meanwhile, Charles wanders around looking for a way to cheat.",
            goal: "Get Alice and Bob to the square with the red potion before the contest ends, and keep Charles away from the judges.",
            hints: {
              hint1: "Elena will only start the contest once Fiona arrives, so keep an eye on where Fiona is.",
              hint2: "George left the recipe at Bob's house; someone may need to pick it up first.",
              hint3: "Charles is very persuasive — do not let him get close to the red potion.",
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
        elena: { name: "Elena" },
        fiona: { name: "Fiona" },
        george: { name: "Jorge" },
      },
      items: {
        cider: { name: "Sidra" },
        bike: { name: "Bicicleta" },
        chocolates: { name: "Caja de Bombones" },
        diamond: { name: "Diamante" },
        key: { name: "Llave de la bóveda" },
        redPotion: { name: "Poción roja" },
        bluePotion: { name: "Poción azul" },
        yellowPotion: { name: "Poción amarilla" },
        greenPotion: { name: "Poción verde" },
        starCoin: { name: "Moneda con estrella" },
        coin: { name: "Moneda" },
      },
      locations: {
        aliceHouse: { name: "Casa de Alicia" },
        bobHouse: { name: "Casa de Rober" },
        charlesHouse: { name: "Casa de Carlos" },
        market: { name: "Supermercado" },
        square: { name: "Plaza" },
        forest: { name: "Bosque" },
      },
      missions: {
        test: {
          name: "Brindis de fin de año",
          victory: "Alicia y Rober consiguieron la sidra, ahora podrán celebrar la llegada de 2025.",
          defeat: "Carlos descubrió que Alicia y Rober están juntos. La noche ha terminado mal.",
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
        test2: {
          name: "El concurso de pociones",
          victory: "Elena y Fiona coronaron a Alicia y Rober como ganadores del concurso de pociones.",
          briefing: {
            situation: "Elena y Fiona organizan un concurso de pociones en la plaza. Alicia y Rober prometieron llevar la poción roja, pero Jorge dejó la receta por error en la casa de Rober. Mientras tanto, Carlos deambula buscando la manera de hacer trampa.",
            goal: "Lográ que Alicia y Rober lleguen a la plaza con la poción roja antes de que termine el concurso, y mantené a Carlos lejos de los jueces.",
            hints: {
              hint1: "Elena solo comenzará el concurso cuando llegue Fiona, así que prestá atención a dónde está Fiona.",
              hint2: "Jorge dejó la receta en la casa de Rober; puede que alguien tenga que ir a buscarla primero.",
              hint3: "Carlos es muy persuasivo: no dejes que se acerque a la poción roja.",
            },
          }
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
        elena: { name: "Helena" },
        fiona: { name: "Fiona" },
        george: { name: "Jorge" },
      },
      items: {
        cider: { name: "Sidra" },
        bike: { name: "Bicicleta" },
        chocolates: { name: "Caixa de Bombons" },
        diamond: { name: "Diamante" },
        key: { name: "Chave do cofre" },
        redPotion: { name: "Poção vermelha" },
        bluePotion: { name: "Poção azul" },
        yellowPotion: { name: "Poção amarela" },
        greenPotion: { name: "Poção verde" },
        starCoin: { name: "Moeda com estrela" },
        coin: { name: "Moeda" },
      },
      locations: {
        aliceHouse: { name: "Casa da Alice" },
        bobHouse: { name: "Casa do Beto" },
        charlesHouse: { name: "Casa do Carlos" },
        market: { name: "Mercado" },
        square: { name: "Praça" },
        forest: { name: "Floresta" },
      },
      plan: {
        walkTo: "Caminhar até...",
        cancel: "Cancelar",
        inTransit: "Em trânsito"
      },
      actions: {
        run: "Avançar"
      },
      messages: {
        defeat: {
          deadline: "O tempo acabou."
        }
      },
      briefingLabels: {
        goal: "Objetivo",
        hints: "Dicas"
      },
      missions: {
        test: {
          name: "Brinde de fim de ano",
          victory: "Alice e Beto conseguiram a sidra; agora podem celebrar a chegada de 2025.",
          defeat: "Carlos descobriu que Alice e Beto estão juntos. A noite terminou mal.",
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
        test2: {
          name: "O concurso de poções",
          victory: "Helena e Fiona coroaram Alice e Beto vencedores do concurso de poções.",
          briefing: {
            situation: "Helena e Fiona organizam um concurso de poções na praça. Alice e Beto prometeram levar a poção vermelha, mas Jorge deixou a receita por engano na casa do Beto. Enquanto isso, Carlos vagueia procurando uma maneira de trapacear.",
            goal: "Faça Alice e Beto chegarem à praça com a poção vermelha antes que o concurso termine, e mantenha Carlos longe dos juízes.",
            hints: {
              hint1: "Helena só vai começar o concurso quando Fiona chegar, então fique de olho onde a Fiona está.",
              hint2: "Jorge deixou a receita na casa do Beto; talvez alguém precise buscá-la primeiro.",
              hint3: "Carlos é muito persuasivo — não deixe que ele chegue perto da poção vermelha.",
            },
          }
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
    redPotion: { id: "redPotion", avatar: potionIcon("#c62f4c") },
    bluePotion: { id: "bluePotion", avatar: potionIcon("#3a83ad") },
    yellowPotion: { id: "yellowPotion", avatar: potionIcon("#c9a93a") },
    greenPotion: { id: "greenPotion", avatar: potionIcon("#558f3c") },
    starCoin: { id: "starCoin", avatar: starCoinIcon },
    coin: { id: "coin", avatar: coinIcon, /* avatarSize: "2.2rem" */ },
  },
  actors: {
    alice:   { id: "alice",   key: 1, color: "#e94560", avatarUrl: "../games/demo/assets/actors/girl2.svg",  avatar: avatarSilhouette("#e94560", /* { style: "long", color: "#7a4a24" } */) },
    bob:     { id: "bob",     key: 2, color: "#4ea1d3", avatarUrl: "../games/demo/assets/actors/boy.svg",    avatar: avatarSilhouette("#4ea1d3") },
    charles: { id: "charles", key: 3, color: "#e0a458", avatarUrl: "../games/demo/assets/actors/male2.svg",  avatar: avatarSilhouette("#e0a458", /*{ style: "short", color: "#c9a24a" } */) },
    dave:    { id: "dave",    key: 4, color: "#6ab04c", avatarUrl: "../games/demo/assets/actors/boy2.svg",   avatar: avatarSilhouette("#6ab04c") },
    elena:   { id: "elena",   key: 5, color: "black",     avatarUrl: "../games/demo/assets/actors/girl.svg" },
    fiona:   { id: "fiona",   key: 6, color: "black",     avatarUrl: "../games/demo/assets/actors/female_hippie.svg" },
    george:  { id: "george",  key: 7, color: "black",     avatarUrl: "../games/demo/assets/actors/male_professional.svg" },
  },
  locations: {
    aliceHouse:   { id: "aliceHouse",   pictureUrl: "../games/demo/assets/locations/blue_house.svg", map: { x: 0, y: -300, width: 200, height: 200 } },
    bobHouse:     { id: "bobHouse",     pictureUrl: "../games/demo/assets/locations/blue_house.svg", map: { x: -400, y: 0, width: 200, height: 200 } },
    charlesHouse: { id: "charlesHouse", pictureUrl: "../games/demo/assets/locations/blue_house.svg", map: { x:  400, y: 0, width: 200, height: 200 } },
    market:       { id: "market",       pictureUrl: "../games/demo/assets/locations/supermarket.svg", map: { x: 0, y:  300, width: 220, height: 220 } },
    square:       { id: "square",       map: { x:    0, y:    0, width: 260, height: 260 } },
    forest:       { id: "forest",       map: { x:  350, y:  350, width: 240, height: 240 } },
  },
  routes: [
    { from: "aliceHouse", to: "square", distance: 1 },
    { from: "bobHouse", to: "square", distance: 1.2 },
    { from: "charlesHouse", to: "square", distance: 1.4 },
    { from: "square", to: "market", distance: 0.5 },
  ],
  missions: [
    {
      id: "test",
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: [
        { id: "alice", location: "aliceHouse", items: ["coin", "bike", "chocolates"] },
        { id: "bob", location: "aliceHouse", items: [] },
        { id: "charles", location: "charlesHouse", items: ["cider"] },
      ],
      locations: ["aliceHouse", "charlesHouse", "market"],
      rules: [
        {
          effect: "victory",                                                              // win condition
          conditions: [
            { kind: "itemAt", item: "cider", at: "aliceHouse" },                          // cider at aliceHouse
            { kind: "actorsAt", actors: ["alice", "bob"], at: "aliceHouse", exact: true } // alice and bob (and only them) at aliceHouse
          ],
          message: "missions.test.victory"
        },
        {
          effect: "defeat",                                                 // loss condition
          conditions: [
            { kind: "actorsTogether", actors: ["alice", "bob", "charles"] } // alice, bob, charles together at the same location
          ],
          message: "missions.test.defeat"
        }
      ],
      briefing: [
        { text: ".situation" },
        { label: "briefingLabels.goal", text: ".goal" },
        { label: "briefingLabels.hints", entries: [".hints.marketHours", ".hints.chocolates", ".hints.relation"] }
      ]
    },
    {
      id: "test2",
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: [
        { id: "alice", location: "aliceHouse", items: ["coin", "bike", "chocolates"] },
        { id: "bob", location: "aliceHouse", items: ["redPotion", "bluePotion", "yellowPotion"] },
        { id: "charles", location: "charlesHouse", items: ["diamond", "greenPotion", "cider", "starCoin", "key"] },
        { id: "dave", location: "charlesHouse" },
        { id: "elena", location: "charlesHouse" },
        { id: "fiona", location: "square" },
        { id: "george", location: "forest" }
      ],
      locations: ["aliceHouse", "bobHouse", "charlesHouse", "square", "forest", "market"],
      briefing: [
        { text: ".situation" },
        { label: "briefingLabels.goal", text: ".goal" },
        { label: "briefingLabels.hints", entries: [".hints.hint1", ".hints.hint2", ".hints.hint3"] }
      ]
    },
  ],
};

window.Demo = { id: "demo", config };
})();
