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

game.commitPlans();
check(game.getActor("alice").activity.kind === "transit", "commitPlans starts transit");
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
game5.commitPlans();
for (let i = 0; i < 50 && !ending; i++) game5.advance();
check(ending && ending.effect === "defeat" && ending.reason === "deadline", "deadline triggers defeat");
check(game5.getStatus() === "ended", "status is ended after deadline");
check(game5.getEnding() && game5.getEnding().effect === "defeat", "getEnding reports defeat");
check(game5.canAdvance() === false, "canAdvance false after ending");
check(game5.advance().ended === null, "advance is a no-op after ending");
check(game5.stop().getStatus() === "ready", "stop from ended -> ready");

if (failures > 0) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("all checks passed");
