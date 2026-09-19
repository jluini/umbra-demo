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
  items: { cider: { id: "cider" } },
  actors: {
    alice: { id: "alice", key: 1 },
    bob: { id: "bob", key: 2 },
  },
  locations: {
    a: { id: "a" },
    b: { id: "b" },
    c: { id: "c" },
  },
  routes: [
    { from: "a", to: "b", distance: 1.5 },
    { from: "b", to: "c", distance: 2 },
  ],
  levels: [{
    id: "test",
    start: "2024-12-31T22:00:00",
    deadline: "2025-01-01T00:00:00",
    actors: [
      { id: "alice", location: "a", items: ["cider"] },
      { id: "bob", location: "a" },
    ],
    locations: ["a", "b", "c"],
    briefing: [{ text: "missions.test.briefing.situation" }],
  }],
};

const game = window.Umbra.create(config);
check(game.getStatus() === "idle", "starts idle");

let missionStarts = 0;
let clockSets = 0;
game.on("mission:start", () => { missionStarts++; });
game.on("clock:set", () => { clockSets++; });

game.start();
check(game.getStatus() === "playing", "start -> playing");
check(missionStarts === 1 && clockSets === 1, "start emits mission:start + clock:set");
check(game.getMission().index === 0, "initial mission index is 0");
check(game.getMission().briefing.length === 1, "mission briefing structure passes through");
check(game.getActor("alice").locationId === "a", "actor location referenced by id");
check(game.getInventory("alice")[0] === "cider", "starting inventory");

check(game.distance("a", "c") === 3.5, "shortest path a->c is 3.5");
check(game.distance("c", "a") === 3.5, "routes are bidirectional");
check(game.computeWalkTime(1.5) === 15, "walk time is 15 min for 1.5 km");

check(game.setPlan("alice", "c") === true, "setPlan accepted");
check(game.setPlan("alice", "b") === true, "setPlan replaces a pending plan");
check(game.setPlan("alice", "c") === true, "setPlan replaces again");
game.play();
check(game.getPlan("alice").startTime === 0, "play assigns startTime");
check(game.setPlan("alice", "a") === false, "setPlan rejected while in transit");

check(game.giveItem("alice", "bob", "cider") === true, "giveItem within same location");
check(game.getInventory("bob").includes("cider"), "bob received the cider");

let arrival = null;
game.on("plan:done", (data) => { arrival = data; });
for (let i = 0; i < 100 && !arrival; i++) {
  game.advanceTime(1);
  for (const completed of game.checkPlans()) {
    game.completePlan(completed.actorId);
  }
}
check(arrival && arrival.locationId === "c", "alice arrived at c");
check(game.getActor("alice").locationId === "c", "actor moved to destination");
check(game.getPlan("alice") === null, "plan cleared on arrival");

check(game.stop().getStatus() === "idle", "stop -> idle");

if (failures > 0) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("all checks passed");
