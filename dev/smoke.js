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
  items: { cider: { id: "cider" }, bread: { id: "bread" } },
  actors: {
    alice: { id: "alice", key: 1 },
    bob: { id: "bob", key: 2 },
  },
  locations: {
    a: { id: "a" },
    b: { id: "b" },
    c: { id: "c" },
    d: { id: "d" },
  },
  routes: [
    { from: "a", to: "b", distance: 1.5 },
    { from: "b", to: "c", distance: 2 },
  ],
  missions: [{
    id: "test",
    start: "2024-12-31T22:00:00",
    deadline: "2025-01-01T00:00:00",
    actors: [
      { id: "alice", location: "a", items: ["cider", "bread"] },
      { id: "bob", location: "a" },
    ],
    locations: ["a", "b", "c"],
    briefing: [{ text: "missions.test.briefing.situation" }],
  }, {
    id: "test2",
    start: "2025-06-01T10:00:00",
    deadline: "2025-06-01T12:00:00",
    actors: [
      { id: "alice", location: "b", items: ["cider"] },
      { id: "bob", location: "c" },
    ],
    locations: ["a", "b", "c"],
    briefing: [{ text: "missions.test2.briefing.situation" }],
  }],
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
check(game.getInventory("alice")[0] === config.items.cider, "starting inventory");

check(game.distance("a", "c") === 3.5, "shortest path a->c is 3.5");
check(game.distance("c", "a") === 3.5, "routes are bidirectional");
check(game.computeWalkTime(1.5) === 15, "walk time is 15 min for 1.5 km");

check(game.giveItem("alice", "bob", config.items.cider) === true, "giveItem within same location");
check(game.getInventory("bob").includes(config.items.cider), "bob received the cider");

check(game.setPlan("alice", "d") === false, "setPlan rejected for a location outside the mission");
check(game.setPlan("alice", "c") === true, "setPlan accepted");
check(game.getPlan("alice").destination === "c", "pending plan holds destination");
check(game.getPlan("alice").duration === 35, "pending plan holds duration");
check(game.setPlan("alice", "b") === true, "setPlan replaces a pending plan");
check(game.cancelPlan("alice") === true, "cancelPlan clears a pending plan");
check(game.getPlan("alice") === null, "plan cleared after cancel");
check(game.setPlan("alice", "c") === true, "setPlan accepted again");
check(game.canAdvance() === true, "canAdvance with a pending plan");

game.advance();
check(game.getActor("alice").activity.kind === "transit", "advance starts transit (auto-commit)");
check(game.getActor("alice").activity.from === "a" && game.getActor("alice").activity.to === "c", "transit keeps from/to");
check(game.getPlan("alice") === null, "plans are cleared once started");
check(Object.keys(game.getPlans()).length === 0, "no pending plans during transit");
check(game.setPlan("alice", "a") === false, "setPlan rejected while in transit");
check(game.cancelPlan("alice") === false, "cancelPlan rejected while in transit");

check(game.giveItem("alice", "bob", config.items.bread) === false, "giveItem rejected when sender is in transit");
check(game.giveItem("bob", "alice", config.items.cider) === false, "giveItem rejected when recipient is in transit");

let arrival = null;
game.on("plans:completed", ({ completed }) => { arrival = completed[0]; });
for (let i = 0; i < 100 && !arrival; i++) {
  game.advance();
}
check(arrival && arrival.locationId === "c", "alice arrived at c");
check(game.getActor("alice").activity.kind === "idle" && game.getActor("alice").activity.at === "c", "actor idle at destination after arrival");
check(game.getPlan("alice") === null, "no plan after arrival");
check(game.canAdvance() === false, "canAdvance false once nothing is in progress");

check(game.giveItem("alice", "bob", config.items.bread) === false, "giveItem rejected across different locations");

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
  actors: { alice: { id: "alice", key: 1 } },
  locations: { a: { id: "a" }, b: { id: "b" } },
  routes: [{ from: "a", to: "b", distance: 10 }],
  missions: [{
    id: "deadline",
    start: "2024-12-31T22:00:00",
    deadline: "2024-12-31T22:10:00",
    actors: [{ id: "alice", location: "a" }],
    locations: ["a", "b"],
  }],
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
  items: { cider: { id: "cider" } },
  actors: {
    alice: { id: "alice", key: 1 },
    bob: { id: "bob", key: 2 },
  },
  locations: { a: { id: "a" }, b: { id: "b" }, c: { id: "c" } },
  routes: [
    { from: "a", to: "b", distance: 1 },
    { from: "b", to: "c", distance: 1 },
  ],
  missions: [
    {
      id: "rules",
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: [
        { id: "alice", location: "a", items: [] },
        { id: "bob", location: "c", items: [] },
      ],
      locations: ["a", "b", "c"],
      rules: [
        { effect: "victory", conditions: [{ kind: "actorsAt", actors: ["alice"], at: "b" }], message: "rules.victory" },
        { effect: "defeat", conditions: [{ kind: "actorsTogether", actors: ["alice", "bob"] }], message: "rules.defeat" },
      ],
    },
    {
      id: "precedence",
      start: "2024-12-31T22:00:00",
      deadline: "2025-01-01T00:00:00",
      actors: [
        { id: "alice", location: "a", items: [] },
        { id: "bob", location: "a", items: [] },
      ],
      locations: ["a", "b", "c"],
      rules: [
        { effect: "victory", conditions: [{ kind: "actorsAt", actors: ["alice", "bob"], at: "b" }], message: "rules.victory" },
        { effect: "defeat", conditions: [{ kind: "actorsTogether", actors: ["alice", "bob"] }], message: "rules.defeat" },
      ],
    },
  ],
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
  missions: [{ ...rulesConfig.missions[0], rules }],
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
  items: { coin: { id: "coin", stackable: true }, cider: { id: "cider" } },
  actors: {
    alice: { id: "alice", key: 1 },
    bob: { id: "bob", key: 2 },
  },
  locations: { a: { id: "a" } },
  routes: [],
  missions: [{
    id: "qty",
    start: "2024-12-31T22:00:00",
    deadline: "2025-01-01T00:00:00",
    actors: [
      { id: "alice", location: "a", items: ["coin:5", "cider"] },
      { id: "bob", location: "a", items: [] },
    ],
    locations: ["a"],
  }],
};

const qg = window.Umbra.create(qtyConfig);
qg.start();
check(qg.getItemCount("alice", "coin") === 5, "starting quantity expands to N items");
check(qg.getInventory("alice").length === 6, "inventory holds N coins plus one cider");
const qgGroups = qg.getItemGroups("alice");
check(qgGroups.length === 2 && qgGroups[0].count === 5, "getItemGroups groups a stack");
check(qg.giveItem("alice", "bob", qtyConfig.items.coin, 2) === true, "giveItem with quantity");
check(qg.getItemCount("alice", "coin") === 3, "sender keeps the remainder");
check(qg.getItemCount("bob", "coin") === 2, "receiver gets the quantity");
check(qg.giveItem("alice", "bob", qtyConfig.items.coin, 10) === false, "giveItem rejects insufficient quantity");
check(qg.giveItem("alice", "bob", qtyConfig.items.cider) === true, "giveItem defaults to quantity 1");
qg.stop();

const qtyConfigWith = (items) => ({
  ...qtyConfig,
  missions: [{
    ...qtyConfig.missions[0],
    actors: [
      { id: "alice", location: "a", items },
      { id: "bob", location: "a", items: [] },
    ],
  }],
});
const expectThrowConfig = (label, cfg) => {
  let threw = false;
  try { window.Umbra.create(cfg).start(); } catch { threw = true; }
  check(threw, label);
};
expectThrowConfig("zero quantity is rejected", qtyConfigWith(["coin:0"]));
expectThrowConfig("fractional quantity is rejected", qtyConfigWith(["coin:1.5"]));
expectThrowConfig("unknown item in starting items is rejected", qtyConfigWith(["nope:1"]));
expectThrowConfig("stackable without a quantity is rejected", qtyConfigWith(["coin"]));
expectThrowConfig("non-stackable with a quantity is rejected", qtyConfigWith(["cider:3"]));
expectThrowConfig("non-numeric quantity is rejected", qtyConfigWith(["coin:x"]));

if (failures > 0) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("all checks passed");
