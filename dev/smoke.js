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

// Items lying loose in a location (carry: optional/none) and itemAt over them.
const looseConfig = ({ items, locationItems } = {}) => ({
  items: items || { skate: { carry: "optional" }, van: { carry: "none" } },
  actors: { alice: { key: 1, skills: ["walk"] } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 1 }],
  means: { walk: { icon: "🚶", pace: 10, skills: [] } },
  missions: {
    items: {
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a" } },
      locations: { a: {}, b: { items: locationItems || ["van", "skate"] } },
      rules: [{ effect: "victory", conditions: [{ kind: "itemAt", item: "van", at: "b" }], message: "items.victory" }],
    },
  },
});
const ig = window.Umbra.create(looseConfig());
ig.start();
const bLoc = ig.getMission().locations.find((l) => l.id === "b");
check(bLoc.items.length === 2 && bLoc.items[0].id === "van" && bLoc.items[1].id === "skate", "location items expand to item objects");
ig.setPlan("alice", "b");
let itemsEnd = null;
ig.on("mission:end", (e) => { itemsEnd = e; });
for (let i = 0; i < 50 && !itemsEnd; i++) ig.advance();
check(itemsEnd && itemsEnd.effect === "victory", "itemAt sees a loose location item");
ig.stop();

expectThrowConfig("required item cannot lie loose in a location", looseConfig({ items: { cider: {} }, locationItems: ["cider"] }));
expectThrowConfig("unknown loose item is rejected", looseConfig({ locationItems: ["nope"] }));
expectThrowConfig("invalid carry value is rejected", looseConfig({ items: { skate: { carry: "sometimes" } }, locationItems: ["skate"] }));
expectThrowConfig("stackable item cannot be optional/none", looseConfig({ items: { coin: { stackable: true, carry: "optional" } }, locationItems: [] }));

// dropItem moves a placeable item from an actor to its current location.
const dropConfig = {
  items: { skate: { carry: "optional" }, hoop: { carry: "optional" }, cider: {} },
  actors: { alice: { key: 1, skills: ["walk"] } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 1 }],
  means: { walk: { icon: "🚶", pace: 10, skills: [] } },
  missions: {
    drop: {
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a", items: ["skate", "hoop", "cider"] } },
      locations: { a: {}, b: {} },
    },
  },
};
const dg = window.Umbra.create(dropConfig);
dg.start();
let dropEvent = null;
dg.on("item:drop", (e) => { dropEvent = e; });
check(dg.dropItem("alice", dg.getConfig().items.skate, 1) === true, "dropItem moves a placeable item to the location");
check(dg.getItemCount("alice", "skate") === 0, "dropped item leaves the actor inventory");
check(dg.getLocation("a").items.length === 1 && dg.getLocation("a").items[0].id === "skate", "location holds the dropped item");
check(dropEvent && dropEvent.locationId === "a" && dropEvent.item.id === "skate", "item:drop is emitted");
check(dg.dropItem("alice", dg.getConfig().items.cider, 1) === false, "required items cannot be dropped");
check(dg.dropItem("bob", dg.getConfig().items.hoop, 1) === false, "unknown actor is rejected");
dg.setPlan("alice", "b");
dg.advance();
check(dg.dropItem("alice", dg.getConfig().items.hoop, 1) === false, "dropping is rejected while in transit");
dg.stop();

// takeItem moves a loose location item into an idle actor's inventory (same location).
const takeConfig = {
  items: { skate: { carry: "optional" }, cider: {} },
  actors: { alice: { key: 1, skills: ["walk"] }, bob: { key: 2, skills: ["walk"] } },
  locations: { a: {}, b: {} },
  routes: [],
  means: { walk: { icon: "🚶", pace: 10, skills: [] } },
  missions: {
    take: {
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a" }, bob: { location: "b" } },
      locations: { a: { items: ["skate"] }, b: {} },
    },
  },
};
const tk = window.Umbra.create(takeConfig);
tk.start();
let takeEvent = null;
tk.on("item:take", (e) => { takeEvent = e; });
check(tk.takeItem("alice", tk.getConfig().items.skate, 1) === true, "takeItem moves a loose item into the actor inventory");
check(tk.getItemCount("alice", "skate") === 1, "actor now carries the taken item");
check(tk.getLocation("a").items.length === 0, "location no longer holds the taken item");
check(takeEvent && takeEvent.actorId === "alice" && takeEvent.item.id === "skate", "item:take is emitted");
check(tk.takeItem("alice", tk.getConfig().items.skate, 1) === false, "cannot take an item that is not there");
check(tk.takeItem("bob", tk.getConfig().items.skate, 1) === false, "cannot take from another location");
check(tk.takeItem("ghost", tk.getConfig().items.skate, 1) === false, "unknown actor is rejected");
tk.stop();

// Mean capacity: how many "additional" items an actor may carry when traveling.
const capConfig = (opts = {}) => ({
  items: { bike: { carry: "optional" }, long: { carry: "optional" }, cider: {}, car: { carry: "none" } },
  actors: { alice: { key: 1, skills: ["walk", "bike", "car"] } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 1 }],
  means: opts.means || {
    walk: { icon: "🚶", pace: 10, capacity: ["1:bike"] },
    bike: { icon: "🚲", pace: 4, items: ["bike"], capacity: ["0:bike|long"] },
    taxi: { icon: "🚕", pace: 2.5, capacity: ["0:bike"], skills: [] },
    metro: { icon: "🚇", pace: 3, capacity: ["1:bike"], skills: ["walk"] },
    van: { icon: "🚐", pace: 3, items: ["car"], capacity: ["0:bike"], skills: ["car"] },
  },
  missions: {
    cap: {
      start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a", items: opts.items || ["bike"] } },
      locations: { a: {}, b: {} },
    },
  },
});
const capIds = (game) => game.getAvailableMeans("alice").map((m) => m.id + (m.blocked ? "!" : ""));

const cap1 = window.Umbra.create(capConfig());
cap1.start();
check(capIds(cap1).join(",") === "walk,bike,taxi!,metro", "capacity: 1 bike -> taxi blocked (0:bike), bike ok (required exempt)");
check(cap1.setPlan("alice", "b", "taxi") === false, "setPlan rejects a capacity-blocked mean");
check(cap1.setPlan("alice", "b", "walk") === true, "setPlan allows a capacity-ok mean");
cap1.stop();

const cap2 = window.Umbra.create(capConfig({ items: ["bike", "bike"] }));
cap2.start();
check(capIds(cap2).join(",") === "walk!,bike!,taxi!,metro!", "capacity: 2 bikes -> walk/bike/taxi/metro blocked");
cap2.stop();

const cap3 = window.Umbra.create(capConfig({ items: ["car"] }));
cap3.start();
check(capIds(cap3).join(",") === "walk!,taxi!,metro!,van", "capacity: 'none' item blocked everywhere except when required");
cap3.stop();

// A required "none" item means exactly one: any extra unit is blocked too.
const noneReqConfig = (items) => ({
  items: { car_1: { carry: "none" }, cider: {} },
  actors: { alice: { key: 1, skills: ["car"] } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 1 }],
  means: { car_1: { icon: "🚗", pace: 3, items: ["car_1"], skills: ["car"] } },
  missions: {
    n: {
      start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a", items } },
      locations: { a: {}, b: {} },
    },
  },
});
const nr1 = window.Umbra.create(noneReqConfig(["car_1"]));
nr1.start();
check(nr1.getAvailableMeans("alice").map((m) => m.id + (m.blocked ? "!" : "")).join(",") === "car_1", "capacity: 1 required 'none' item -> ok");
nr1.stop();
const nr2 = window.Umbra.create(noneReqConfig(["car_1", "car_1"]));
nr2.start();
check(nr2.getAvailableMeans("alice").map((m) => m.id + (m.blocked ? "!" : "")).join(",") === "car_1!", "capacity: 2 required 'none' items -> blocked (excess counts)");
nr2.stop();

expectThrowConfig("capacity referencing a required item is rejected", capConfig({ means: { walk: { icon: "🚶", pace: 10, capacity: ["0:cider"] } } }));
expectThrowConfig("capacity referencing a none item is rejected", capConfig({ means: { walk: { icon: "🚶", pace: 10, capacity: ["0:car"] } } }));
expectThrowConfig("capacity referencing an unknown item is rejected", capConfig({ means: { walk: { icon: "🚶", pace: 10, capacity: ["0:ghost"] } } }));
expectThrowConfig("capacity with invalid format is rejected", capConfig({ means: { walk: { icon: "🚶", pace: 10, capacity: ["bike"] } } }));
expectThrowConfig("capacity with a non-numeric max is rejected", capConfig({ means: { walk: { icon: "🚶", pace: 10, capacity: ["x:bike"] } } }));
const capPeople = window.Umbra.create(capConfig({ means: { walk: { icon: "🚶", pace: 10, capacity: ["3:people"] } } }));
capPeople.start();
check(capPeople.getStatus() === "running", "capacity reserved category 'people' is allowed");
capPeople.stop();

// Pending plans are protected: a transfer that would invalidate one is rejected.
const invConfig = () => ({
  items: { bike: { carry: "optional" }, cider: {} },
  actors: { alice: { key: 1, skills: ["walk", "bike"] }, bob: { key: 2, skills: ["walk"] } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 1 }],
  means: {
    walk: { icon: "🚶", pace: 10, capacity: ["1:bike"] },
    bike: { icon: "🚲", pace: 4, items: ["bike"], capacity: ["0:bike"] },
  },
  missions: {
    inv: {
      start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a", items: ["bike"] }, bob: { location: "a" } },
      locations: { a: {}, b: {} },
    },
  },
});
const inv = window.Umbra.create(invConfig());
inv.start();
check(inv.setPlan("alice", "b", "bike") === true, "plan set via a mean that requires an item");
check(inv.giveItem("alice", "bob", inv.getConfig().items.bike) === false, "giveItem rejected: would break the giver's plan");
check(inv.dropItem("alice", inv.getConfig().items.bike) === false, "dropItem rejected: would break the plan");
check(inv.cancelPlan("alice") === true, "plan cancelled");
check(inv.giveItem("alice", "bob", inv.getConfig().items.bike) === true, "giveItem allowed once the plan is gone");
inv.stop();

const invTakeConfig = () => ({
  items: { bike: { carry: "optional" }, cider: {} },
  actors: { alice: { key: 1, skills: ["walk"] } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 1 }],
  means: {
    walk: { icon: "🚶", pace: 10, capacity: ["1:bike"] },
    taxi: { icon: "🚕", pace: 2.5, capacity: ["0:bike"], skills: [] },
  },
  missions: {
    inv: {
      start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a" } },
      locations: { a: { items: ["bike"] }, b: {} },
    },
  },
});
const invTake = window.Umbra.create(invTakeConfig());
invTake.start();
check(invTake.setPlan("alice", "b", "taxi") === true, "plan set via taxi (no bikes held)");
check(invTake.takeItem("alice", invTake.getConfig().items.bike) === false, "takeItem rejected: would exceed the taxi capacity");
check(invTake.cancelPlan("alice") === true, "plan cancelled");
check(invTake.takeItem("alice", invTake.getConfig().items.bike) === true, "takeItem allowed once the plan is gone");
invTake.stop();

// Safety net: commitPlans revalidates and cancels invalid plans (e.g. via trade).
const invTradeConfig = () => ({
  items: { bike: { carry: "optional" }, cider: {} },
  actors: { alice: { key: 1, skills: ["walk", "bike"] } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 1 }],
  means: { bike: { icon: "🚲", pace: 4, items: ["bike"], capacity: ["0:bike"] } },
  missions: {
    inv: {
      start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a", items: ["bike"] } },
      locations: {
        a: { trades: { sell: { cost: [{ item: "bike", quantity: 1 }], reward: [{ item: "cider", quantity: 1 }] } } },
        b: {},
      },
    },
  },
});
const invTrade = window.Umbra.create(invTradeConfig());
invTrade.start();
check(invTrade.setPlan("alice", "b", "bike") === true, "plan set before trade");
check(invTrade.trade("alice", "a", "sell") === true, "trade removes the required item (unguarded for now)");
let cancelledEvent = null;
invTrade.on("plans:cancelled", (e) => { cancelledEvent = e; });
invTrade.advance();
check(cancelledEvent && cancelledEvent.cancelled.length === 1 && cancelledEvent.cancelled[0].actorId === "alice" && cancelledEvent.cancelled[0].reason === "mean",
  "commitPlans cancels an invalid plan and emits plans:cancelled with a reason");
check(invTrade.getActor("alice").activity.kind === "idle", "cancelled plan did not start transit");
check(Object.keys(invTrade.getPlans()).length === 0, "cancelled plan cleared");
invTrade.stop();

// A valid plan commits normally (no cancellation event).
const invOk = window.Umbra.create(invConfig());
invOk.start();
let okCancelled = false;
invOk.on("plans:cancelled", () => { okCancelled = true; });
invOk.setPlan("alice", "b", "walk");
invOk.advance();
check(!okCancelled && invOk.getActor("alice").activity.kind === "transit", "valid plan commits without cancellation");
invOk.stop();

// Loose vehicles: a required item lying at the actor's location can be used,
// reserving it for the trip (and placed on arrival per its carry policy).
const looseVehConfig = (aItems) => ({
  items: { bike: { carry: "optional" }, car_1: { carry: "none" }, cider: {} },
  actors: { alice: { key: 1, skills: ["walk", "bike", "car"] }, bob: { key: 2, skills: ["bike"] } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 1 }],
  means: {
    bike: { icon: "🚲", pace: 4, items: ["bike"], capacity: ["0:bike"] },
    car_1: { icon: "🚗", pace: 3, items: ["car_1"], capacity: ["0:bike"] },
  },
  missions: {
    lv: {
      start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a" }, bob: { location: "a" } },
      locations: { a: { items: aItems }, b: {} },
    },
  },
});
const lvIds = (game, id) => game.getAvailableMeans(id).map((m) => m.id).join(",");
const advanceUntilIdle = (game, actorId) => {
  game.advance(); // commit pending plans
  for (let i = 0; i < 20 && game.getActor(actorId).activity.kind === "transit"; i++) game.advance();
};

const lv = window.Umbra.create(looseVehConfig(["bike"]));
lv.start();
check(lvIds(lv, "alice").includes("bike"), "loose vehicle: bike available from the location");
check(lv.setPlan("alice", "b", "bike") === true, "loose vehicle: plan set via a loose required item");
check(lv.getLocation("a").items.length === 0, "loose vehicle: reserved item removed from the location");
check(lv.getPlan("alice").vehicle && lv.getPlan("alice").vehicle.itemId === "bike", "plan holds the reserved vehicle");
check(!lvIds(lv, "bob").includes("bike"), "reservation blocks other actors at the same location");
check(lv.cancelPlan("alice") === true, "cancel plan releases the reservation");
check(lv.getLocation("a").items.length === 1 && lvIds(lv, "bob").includes("bike"), "released item is available again");
lv.stop();

const lv2 = window.Umbra.create(looseVehConfig(["bike"]));
lv2.start();
lv2.setPlan("bob", "b", "bike");
advanceUntilIdle(lv2, "bob");
check(lv2.getActor("bob").activity.kind === "idle" && lv2.getActor("bob").activity.at === "b", "optional reserved vehicle: actor arrived");
check(lv2.getItemCount("bob", "bike") === 1, "optional reserved vehicle goes to the actor inventory on arrival");
check((lv2.getLocation("b").items || []).length === 0, "optional vehicle is not left at the destination");
lv2.stop();

const lv3 = window.Umbra.create(looseVehConfig(["car_1"]));
lv3.start();
check(lv3.takeItem("alice", lv3.getConfig().items.car_1) === false, "takeItem rejects carry 'none'");
check(lv3.setPlan("alice", "b", "car_1") === true, "plan set via a loose 'none' vehicle");
advanceUntilIdle(lv3, "alice");
check(lv3.getActor("alice").activity.at === "b", "none reserved vehicle: actor arrived");
check(lv3.getLocation("b").items.some((it) => it.id === "car_1"), "none reserved vehicle is left loose at the destination");
check(lv3.getItemCount("alice", "car_1") === 0, "none reserved vehicle is not kept in inventory");
lv3.stop();

// A reserved vehicle counts as inventory for plan validity: an extra required
// item is excess and must invalidate the plan (so the transfer is rejected).
const resCapConfig = () => ({
  items: { bike: { carry: "optional" } },
  actors: { alice: { key: 1, skills: ["bike"] }, bob: { key: 2, skills: ["bike"] } },
  locations: { a: {}, b: {} },
  routes: [{ from: "a", to: "b", distance: 1 }],
  means: { bike: { icon: "🚲", pace: 4, items: ["bike"], capacity: ["0:bike"] } },
  missions: {
    rc: {
      start: "2024-12-31T22:00:00", deadline: "2025-01-01T00:00:00",
      actors: { alice: { location: "a", items: ["bike"] }, bob: { location: "a" } },
      locations: { a: { items: ["bike"] }, b: {} },
    },
  },
});
const rc = window.Umbra.create(resCapConfig());
rc.start();
check(rc.setPlan("bob", "b", "bike") === true, "reserved capacity: bob plans via the loose bike");
check(rc.getPlan("bob").vehicle && rc.getPlan("bob").vehicle.itemId === "bike", "reserved capacity: bike is reserved");
check(rc.giveItem("alice", "bob", rc.getConfig().items.bike) === false, "reserved capacity: extra bike rejected (reserved counts as carried)");
check(rc.getPlan("bob") !== null, "reserved capacity: plan still pending after rejected give");
rc.advance();
check(rc.getActor("bob").activity.kind === "transit", "reserved capacity: plan still commits normally");
rc.stop();

// setPlan with an existing plan cancels it first (releasing its reserved vehicle).
const rc2 = window.Umbra.create(resCapConfig());
rc2.start();
rc2.setPlan("bob", "b", "bike");
check(rc2.getLocation("a").items.filter((it) => it.id === "bike").length === 0, "setPlan replace: loose bike reserved");
let planCancels = 0;
rc2.on("plan:cancel", () => { planCancels++; });
check(rc2.setPlan("bob", "b", "bike") === true, "setPlan replace: re-plan succeeds");
check(planCancels === 1, "setPlan replace: previous plan cancelled (plan:cancel emitted)");
check(rc2.getLocation("a").items.filter((it) => it.id === "bike").length === 0, "setPlan replace: released then re-reserved (no orphan)");
check(rc2.getPlan("bob").vehicle && rc2.getPlan("bob").vehicle.itemId === "bike", "setPlan replace: new plan holds a reserved vehicle");
rc2.stop();

if (failures > 0) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("all checks passed");
