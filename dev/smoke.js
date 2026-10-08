// Smoke test for the umbra engine. Run with: node dev/smoke.js
"use strict";

const path = require("path");
const root = path.join(__dirname, "..");

global.window = global;
require(path.join(root, "umbra/umbra.js"));

let failures = 0;
const check = (cond, label) => {
  if (cond) {
    console.log("ok   " + label);
  } else {
    failures++;
    console.error("FAIL " + label);
  }
};

const config = {
  items: { cider: {}, bread: {} },
  actors: {
    alice: { key: 1, skills: ["walk", "bike", "car"] },
    bob: { key: 2, skills: ["walk"] },
  },
  locations: {
    a: {},
    b: {},
    c: {},
    d: {},
  },
  routes: [
    { from: "a", to: "b", distance: 1.5 },
    { from: "b", to: "c", distance: 2 },
  ],
  means: {
    walk: { icon: "🚶", pace: 10 },
    bike: { icon: "🚲", pace: 4, items: ["bread"] },
    taxi: { icon: "🚕", pace: 2.5, skills: [] },
    metro: { icon: "🚇", pace: 3, skills: ["walk"] },
    car_2: { icon: "🚙", pace: 3 },
  },
  missions: {
    test: {
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: {
        alice: { location: "a", items: ["cider", "bread"] },
        bob: { location: "a" },
      },
      locations: { a: {}, b: {}, c: {} },
      briefing: [{ text: "missions.test.briefing.situation" }],
    },
    test2: {
      start: "2025-06-01T10:00:00",
      deadline: "2025-06-01T12:00:00",
      actors: {
        alice: { location: "b", items: ["cider"] },
        bob: { location: "c" },
      },
      locations: { a: {}, b: {}, c: {} },
      briefing: [{ text: "missions.test2.briefing.situation" }],
    },
  },
};

const game = window.Umbra.create(config);
check(game.getStatus() === "ready", "starts ready");

let missionStarts = 0;
let clockSets = 0;
game.on("mission:start", () => { missionStarts++; });
game.on("clock:set", () => { clockSets++; });

game.start();
check(game.getStatus() === "running", "start -> running");
check(missionStarts === 1 && clockSets === 1, "start emits mission:start + clock:set");
check(game.getMission().index === 0, "initial mission index is 0");
check(game.getMission().briefing.length === 1, "mission briefing structure passes through");
check(game.getActor("alice").activity.kind === "idle", "actor starts idle");
check(game.getActor("alice").activity.at === "a", "actor starts at its mission location");
check(game.getActor("alice").id === "alice", "runtime actor id comes from the config key");
check(game.getInventory("alice")[0].id === "cider", "starting inventory");
check(game.getConfig().actors.alice.id === "alice", "config actor id injected from key");
check(game.getConfig().items.cider.id === "cider", "config item id injected from key");
check(game.getConfig().locations.a.id === "a", "config location id injected from key");
check(game.getConfig().means.walk.id === "walk", "config mean id injected from key");

check(game.distance("a", "c") === 3.5, "shortest path a->c is 3.5");
check(game.distance("c", "a") === 3.5, "routes are bidirectional");
check(game.computeTravelTime(1.5, "walk") === 15, "walk time is 15 min for 1.5 km");
check(game.getAvailableMeans("alice").map((m) => m.id).join(",") === "walk,bike,taxi,metro,car_2", "alice means: item+skill gating (incl. derived 'car')");
check(game.getAvailableMeans("bob").map((m) => m.id).join(",") === "walk,taxi,metro", "bob means: explicit skills only");
check(game.getAvailableMeans("bob").every((m) => m.id !== "bike"), "bob cannot use bike (no item, no skill)");
check(game.computeTravelTime(1.5, "bike") === 6, "bike time is 6 min for 1.5 km");

check(game.giveItem("alice", "bob", game.getConfig().items.cider) === true, "giveItem within same location");
check(game.getInventory("bob").some((it) => it.id === "cider"), "bob received the cider");

check(game.setPlan("alice", "d") === false, "setPlan rejected for a location outside the mission");
check(game.setPlan("alice", "c") === true, "setPlan accepted");
check(game.getPlan("alice").destination === "c", "pending plan holds destination");
check(game.getPlan("alice").duration === 35, "pending plan holds duration");
check(game.getPlan("alice").mean === "walk", "pending plan defaults to walk");
check(game.setPlan("alice", "c", "bike") === true, "setPlan accepts bike (has its item)");
check(game.getPlan("alice").mean === "bike" && game.getPlan("alice").duration === 14, "bike plan holds mean + duration (3.5*4)");
check(game.setPlan("bob", "c", "bike") === false, "setPlan rejects bike without the item");
check(game.setPlan("alice", "b") === true, "setPlan replaces a pending plan");
check(game.cancelPlan("alice") === true, "cancelPlan clears a pending plan");
check(game.getPlan("alice") === null, "plan cleared after cancel");
check(game.setPlan("alice", "c") === true, "setPlan accepted again");
check(game.canAdvance() === true, "canAdvance with a pending plan");

game.advance();
check(game.getActor("alice").activity.kind === "transit", "advance starts transit (auto-commit)");
check(game.getActor("alice").activity.from === "a" && game.getActor("alice").activity.to === "c", "transit keeps from/to");
check(game.getActor("alice").activity.mean === "walk", "transit keeps mean");
check(game.getPlan("alice") === null, "plans are cleared once started");
check(Object.keys(game.getPlans()).length === 0, "no pending plans during transit");
check(game.setPlan("alice", "a") === false, "setPlan rejected while in transit");
check(game.cancelPlan("alice") === false, "cancelPlan rejected while in transit");

check(game.giveItem("alice", "bob", game.getConfig().items.bread) === false, "giveItem rejected when sender is in transit");
check(game.giveItem("bob", "alice", game.getConfig().items.cider) === false, "giveItem rejected when recipient is in transit");

let arrival = null;
game.on("plans:completed", ({ completed }) => { arrival = completed[0]; });
for (let i = 0; i < 100 && !arrival; i++) {
  game.advance();
}
check(arrival && arrival.locationId === "c", "alice arrived at c");
check(game.getActor("alice").activity.kind === "idle" && game.getActor("alice").activity.at === "c", "actor idle at destination after arrival");
check(game.getPlan("alice") === null, "no plan after arrival");
check(game.canAdvance() === false, "canAdvance false once nothing is in progress");

check(game.giveItem("alice", "bob", game.getConfig().items.bread) === false, "giveItem rejected across different locations");

check(game.stop().getStatus() === "ready", "stop -> ready");

const game2 = window.Umbra.create(config);
game2.start(1);
check(game2.getMission().id === "test2", "start(index) selects the requested mission");
check(game2.getMission().index === 1, "requested mission index is reported");
check(game2.getActor("alice").activity.at === "b", "requested mission uses its own actor locations");
game2.stop();

const game3 = window.Umbra.create(config);
game3.start(99);
check(game3.getMission().index === 0, "out-of-range index falls back to the initial mission");
game3.stop();

// advance() commits pending plans before moving time.
const game4 = window.Umbra.create(config);
game4.start();
game4.setPlan("alice", "c");
game4.advance();
check(game4.getActor("alice").activity.kind === "transit", "advance auto-commits pending plans");
check(game4.getInternalTime() === 1, "advance moves one minute");
game4.stop();

// Reaching the deadline ends the mission in defeat.
const deadlineConfig = {
  items: {},
  actors: { alice: { key: 1 } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 10 }],
  means: { walk: { icon: "🚶", pace: 10, skills: [] } },
  missions: {
    deadline: {
      start: "2024-12-31T22:00:00",
      deadline: "2024-12-31T22:10:00",
      actors: { alice: { location: "a" } },
      locations: { a: {}, b: {} },
    },
  },
};
const game5 = window.Umbra.create(deadlineConfig);
game5.start();
let ending = null;
game5.on("mission:end", (e) => { ending = e; });
game5.setPlan("alice", "b");
for (let i = 0; i < 50 && !ending; i++) game5.advance();
check(ending && ending.effect === "defeat" && ending.reason === "deadline", "deadline triggers defeat");
check(ending.message === "messages.defeat.deadline", "deadline ending carries its message key");
check(game5.getStatus() === "ended", "status is ended after deadline");
check(game5.getEnding() && game5.getEnding().effect === "defeat", "getEnding reports defeat");
check(game5.canAdvance() === false, "canAdvance false after ending");
check(game5.advance().ended === null, "advance is a no-op after ending");
check(game5.stop().getStatus() === "ready", "stop from ended -> ready");

// Restarting a mission rebuilds its initial state.
game5.start();
check(game5.getInternalTime() === 0, "restart resets the clock");
check(game5.getActor("alice").activity.kind === "idle" && game5.getActor("alice").activity.at === "a", "restart resets actor activity");
check(game5.getInventory("alice").length === 0, "restart resets inventory");
game5.stop();

// Rules: victory/defeat conditions evaluated when a plan completes.
const rulesConfig = {
  items: { cider: {} },
  actors: {
    alice: { key: 1 },
    bob: { key: 2 },
  },
  locations: { a: {}, b: {}, c: {} },
  routes: [
    { from: "a", to: "b", distance: 1 },
    { from: "b", to: "c", distance: 1 },
  ],
  means: { walk: { icon: "🚶", pace: 10, skills: [] } },
  missions: {
    rules: {
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: {
        alice: { location: "a", items: [] },
        bob: { location: "c", items: [] },
      },
      locations: { a: {}, b: {}, c: {} },
      rules: [
        { effect: "victory", conditions: [{ kind: "actorsAt", actors: ["alice"], at: "b" }], message: "rules.victory" },
        { effect: "defeat", conditions: [{ kind: "actorsTogether", actors: ["alice", "bob"] }], message: "rules.defeat" },
      ],
    },
    precedence: {
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: {
        alice: { location: "a", items: [] },
        bob: { location: "a", items: [] },
      },
      locations: { a: {}, b: {}, c: {} },
      rules: [
        { effect: "victory", conditions: [{ kind: "actorsAt", actors: ["alice", "bob"], at: "b" }], message: "rules.victory" },
        { effect: "defeat", conditions: [{ kind: "actorsTogether", actors: ["alice", "bob"] }], message: "rules.defeat" },
      ],
    },
  },
};

// Victory rule fires when its completion makes the condition true.
const rg1 = window.Umbra.create(rulesConfig);
rg1.start(0);
let rulesEnd = null;
rg1.on("mission:end", (e) => { rulesEnd = e; });
rg1.setPlan("alice", "b");
rg1.advance();
check(rulesEnd === null, "no ending before the rule condition holds");
for (let i = 0; i < 50 && !rulesEnd; i++) rg1.advance();
check(rulesEnd && rulesEnd.effect === "victory" && rulesEnd.reason === "rule", "victory rule fires on completion");
check(rulesEnd.message === "rules.victory", "victory rule carries its message");
check(rg1.getStatus() === "ended", "status ended after rule victory");
rg1.stop();

// Defeat rule fires on the actor that joins the others.
const rg2 = window.Umbra.create(rulesConfig);
rg2.start(0);
let rulesEnd2 = null;
rg2.on("mission:end", (e) => { rulesEnd2 = e; });
rg2.setPlan("bob", "a");
for (let i = 0; i < 50 && !rulesEnd2; i++) rg2.advance();
check(rulesEnd2 && rulesEnd2.effect === "defeat" && rulesEnd2.reason === "rule", "defeat rule fires on completion");
rg2.stop();

// Defeat takes precedence over victory when both match.
const rg3 = window.Umbra.create(rulesConfig);
rg3.start(1);
let rulesEnd3 = null;
rg3.on("mission:end", (e) => { rulesEnd3 = e; });
rg3.setPlan("alice", "b");
rg3.setPlan("bob", "b");
for (let i = 0; i < 50 && !rulesEnd3; i++) rg3.advance();
check(rulesEnd3 && rulesEnd3.effect === "defeat", "defeat takes precedence over victory");
rg3.stop();

// Rule validation rejects typos.
const rulesConfigWith = (rules) => ({
  ...rulesConfig,
  missions: { rules: { ...rulesConfig.missions.rules, rules } },
});
const expectStartThrow = (label, rules) => {
  let threw = false;
  try {
    window.Umbra.create(rulesConfigWith(rules)).start(0);
  } catch {
    threw = true;
  }
  check(threw, label);
};
expectStartThrow("unknown condition kind is rejected", [{ effect: "victory", conditions: [{ kind: "nope" }] }]);
expectStartThrow("unknown effect is rejected", [{ effect: "draw", conditions: [{ kind: "actorsAt", actors: ["alice"], at: "b" }] }]);
expectStartThrow("unknown actor is rejected", [{ effect: "victory", conditions: [{ kind: "actorsTogether", actors: ["ghost"] }] }]);
expectStartThrow("unknown location is rejected", [{ effect: "victory", conditions: [{ kind: "actorsAt", actors: ["alice"], at: "nowhere" }] }]);
expectStartThrow("unknown item is rejected", [{ effect: "victory", conditions: [{ kind: "itemAt", item: "nope", at: "b" }] }]);
expectStartThrow("empty conditions are rejected", [{ effect: "victory", conditions: [] }]);

// Stackable items: quantities in starting items and partial transfers.
const qtyConfig = {
  items: { coin: { stackable: true }, cider: {} },
  actors: {
    alice: { key: 1 },
    bob: { key: 2 },
  },
  locations: { a: {} },
  routes: [],
  missions: {
    qty: {
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: {
        alice: { location: "a", items: ["coin:5", "cider"] },
        bob: { location: "a", items: [] },
      },
      locations: { a: {} },
    },
  },
};

const qg = window.Umbra.create(qtyConfig);
qg.start();
check(qg.getItemCount("alice", "coin") === 5, "starting quantity expands to N items");
check(qg.getInventory("alice").length === 6, "inventory holds N coins plus one cider");
const qgGroups = qg.getItemGroups("alice");
check(qgGroups.length === 2 && qgGroups[0].count === 5, "getItemGroups groups a stack");
check(qg.giveItem("alice", "bob", qg.getConfig().items.coin, 2) === true, "giveItem with quantity");
check(qg.getItemCount("alice", "coin") === 3, "sender keeps the remainder");
check(qg.getItemCount("bob", "coin") === 2, "receiver gets the quantity");
check(qg.giveItem("alice", "bob", qg.getConfig().items.coin, 10) === false, "giveItem rejects insufficient quantity");
check(qg.giveItem("alice", "bob", qg.getConfig().items.cider) === true, "giveItem defaults to quantity 1");
qg.stop();

const qtyConfigWith = (items) => ({
  ...qtyConfig,
  missions: {
    qty: {
      ...qtyConfig.missions.qty,
      actors: {
        alice: { location: "a", items },
        bob: { location: "a", items: [] },
      },
    },
  },
});
const expectThrowConfig = (label, cfg) => {
  let threw = false;
  try { window.Umbra.create(cfg).start(); } catch { threw = true; }
  check(threw, label);
};
const idConfig = (patch) => ({
  items: {},
  actors: { alice: { key: 1 } },
  locations: { a: {} },
  routes: [],
  means: { walk: { icon: "🚶", pace: 10, skills: [] } },
  missions: { x: { start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00", actors: { alice: { location: "a" } }, locations: { a: {} } } },
  ...patch,
});
expectThrowConfig("zero quantity is rejected", qtyConfigWith(["coin:0"]));
expectThrowConfig("fractional quantity is rejected", qtyConfigWith(["coin:1.5"]));
expectThrowConfig("unknown item in starting items is rejected", qtyConfigWith(["nope:1"]));
expectThrowConfig("stackable without a quantity is rejected", qtyConfigWith(["coin"]));
expectThrowConfig("non-stackable with a quantity is rejected", qtyConfigWith(["cider:3"]));
expectThrowConfig("non-numeric quantity is rejected", qtyConfigWith(["coin:x"]));
expectThrowConfig("mission actor entry must not define 'id'", idConfig({
  missions: { x: { start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00", actors: { alice: { location: "a", id: "alice" } }, locations: { a: {} } } },
}));
expectThrowConfig("config actor must not define 'id'", idConfig({ actors: { alice: { key: 1, id: "alice" } } }));
expectThrowConfig("config item must not define 'id'", idConfig({ items: { cider: { id: "cider" } } }));
expectThrowConfig("config location must not define 'id'", idConfig({ locations: { a: { id: "a" } } }));
expectThrowConfig("config mean must not define 'id'", idConfig({ means: { walk: { id: "walk", icon: "🚶", pace: 10, skills: [] } } }));
expectThrowConfig("config mission must not define 'id'", idConfig({ missions: { x: { id: "x", start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00", actors: { alice: { location: "a" } }, locations: { a: {} } } } }));
expectThrowConfig("mission location override must not define 'id'", idConfig({
  missions: { x: { start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00", actors: { alice: { location: "a" } }, locations: { a: { id: "a" } } } },
}));

// Trades: mission locations keyed by id and item exchanges.
const tradesConfig = {
  items: { coin: { stackable: true }, cider: {} },
  actors: { alice: { key: 1 } },
  locations: { shop: { map: { x: 0, y: 0, width: 10, height: 10 } } },
  routes: [],
  missions: {
    trade: {
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "shop", items: ["coin:5"] } },
      locations: {
        shop: {
          trades: {
            cider: { cost: [{ item: "coin", quantity: 3 }], reward: [{ item: "cider", quantity: 1 }] },
          },
        },
      },
    },
  },
};

const tg = window.Umbra.create(tradesConfig);
tg.start();
check(tg.getMission().locations[0].map !== undefined && tg.getTrades("shop").length === 1, "mission location override merges base fields");
let tradeEvent = null;
tg.on("item:trade", (e) => { tradeEvent = e; });
check(tg.canTrade("alice", "shop", "cider").ok === true, "canTrade ok");
check(tg.trade("alice", "shop", "cider") === true, "trade succeeds");
check(tg.getItemCount("alice", "coin") === 2, "trade consumes the cost");
check(tg.getItemCount("alice", "cider") === 1, "trade grants the reward");
check(tradeEvent && tradeEvent.tradeId === "cider", "item:trade is emitted");
check(tg.trade("alice", "shop", "cider") === false, "trade rejects insufficient cost");
check(tg.canTrade("alice", "shop", "cider").reason === "missingCost", "insufficient cost is reported");
check(tg.canTrade("alice", "shop", "nope").reason === "unknown", "unknown trade is reported");
check(tg.canTrade("alice", "elsewhere", "cider").reason === "notHere", "wrong location is reported");
tg.stop();

const tradesConfigWith = (trades) => ({
  ...tradesConfig,
  missions: {
    trade: {
      ...tradesConfig.missions.trade,
      locations: { shop: { trades } },
    },
  },
});
expectThrowConfig("trade with unknown item is rejected", tradesConfigWith({ x: { cost: [{ item: "nope", quantity: 1 }], reward: [] } }));
expectThrowConfig("trade with invalid quantity is rejected", tradesConfigWith({ x: { cost: [{ item: "coin", quantity: 0 }], reward: [] } }));
expectThrowConfig("trade entry must not define 'id'", tradesConfigWith({ x: { id: "x", cost: [], reward: [] } }));

if (failures > 0) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("all checks passed");
