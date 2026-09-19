(() => {
"use strict";

const parseDate = (s) => new Date(s);
const WALKING_PACE = 10;
const MS_PER_MINUTE = 60000;

const engineTranslations = {
  en: {
    // startsAt: "Starts at", deadline: "Deadline", clock: "Clock", briefing: "Briefing",
    umbra: {
      tagline: "a decision-based game engine",
      mission: "Mission",
      actors: "Actors",
      items: "Items",
      locations: "Locations",
    },
    menu: {
      play: "Play",
      continue: "Continue",
      credits: "Credits",
      about: "About"
    },
    briefing_labels: {
      goal: "Goal",
      hints: "Hints"
    },
  },
  es: {
    // startsAt: "Comienza a las", deadline: "Fecha límite", clock: "Reloj", briefing: "Resumen",
    umbra: {
      tagline: "un motor de juegos basados en decisiones",
      mission: "Misión",
      actors: "Actores",
      items: "Objetos",
      locations: "Locaciones",
    },
    menu: {
      play: "Jugar",
      continue: "Continuar",
      credits: "Créditos",
      about: "Acerca de"
    },
    briefing_labels: {
      goal: "Objetivo",
      hints: "Pistas"
    },
  },
  de: {
    // startsAt: "Beginnt um", deadline: "Frist", clock: "Uhr", briefing: "Lagebesprechung",
    umbra: {
      tagline: "eine entscheidungsbasierte Spiel-Engine",
      mission: "Mission",
      actors: "Schauspieler",
      items: "Gegenstände",
      locations: "Orte",
    },
    menu: {
      play: "Spielen",
      continue: "Weiter",
      credits: "Mitwirkende",
      about: "Über uns"
    },
    briefing_labels: {
      goal: "Ziel",
      hints: "Hinweise"
    }
  }
};

const getInitialMissionIndex = () => 0;

const computeWalkTime = (distance) => Math.round(distance * WALKING_PACE);

const distanceFrom = (matrix, from, to) => {
  if (!matrix[from]) return Infinity;
  const d = matrix[from][to];
  return d !== undefined ? d : Infinity;
};

const buildDistanceMatrix = (config) => {
  const locs = Object.keys(config.locations || {});
  const n = locs.length;
  const idx = {};
  locs.forEach((id, i) => { idx[id] = i; });

  const INF = Infinity;
  const matrix = Array.from({ length: n }, () => Array(n).fill(INF));
  locs.forEach((id, i) => { matrix[i][i] = 0; });

  for (const route of (config.routes || [])) {
    const i = idx[route.from];
    const j = idx[route.to];
    if (i !== undefined && j !== undefined) {
      matrix[i][j] = route.distance;
      matrix[j][i] = route.distance;
    }
  }

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][k] + matrix[k][j] < matrix[i][j]) {
          matrix[i][j] = matrix[i][k] + matrix[k][j];
        }
      }
    }
  }

  const dist = {};
  locs.forEach((idI, i) => {
    locs.forEach((idJ, j) => {
      dist[idI] = dist[idI] || {};
      dist[idI][idJ] = matrix[i][j];
    });
  });
  return dist;
};

const findActor = (mission, id) =>
  mission ? (mission.actors.find((a) => a.id === id) || null) : null;

const findLocation = (mission, id) =>
  mission ? (mission.locations.find((l) => l.id === id) || null) : null;

const canReplacePlan = (plan) => !plan || plan.startTime === null;

const buildPlan = (actor, destination, matrix) => ({
  destination,
  from: actor.locationId,
  startTime: null,
  walkTime: computeWalkTime(distanceFrom(matrix, actor.locationId, destination)),
});

const moveItem = (inventory, fromActorId, toActorId, itemId) => {
  const fromItems = inventory[fromActorId];
  if (!fromItems) return false;
  const idx = fromItems.indexOf(itemId);
  if (idx === -1) return false;
  fromItems.splice(idx, 1);
  if (!inventory[toActorId]) inventory[toActorId] = [];
  inventory[toActorId].push(itemId);
  return true;
};

const buildActors = (config, mission, missionLocs) =>
  (mission.actors || []).map((a) => {
    const base = config.actors && config.actors[a.id];
    if (!base) {
      throw new Error("umbra: actor '" + a.id + "' is not defined in config.actors");
    }
    const loc = config.locations[a.location];
    if (!loc || !missionLocs.has(a.location)) {
      throw new Error("umbra: actor '" + a.id + "' starts at '" + a.location + "' which is not in mission locations");
    }
    return { ...base, locationId: a.location, items: (a.items || []).slice() };
  });

const buildInventory = (config, mission) => {
  const validItems = new Set(Object.keys(config.items || {}));
  const inventory = {};
  for (const a of mission.actors || []) {
    const items = a.items || [];
    for (const itemId of items) {
      if (!validItems.has(itemId)) {
        throw new Error("umbra: actor '" + a.id + "' has unknown item '" + itemId + "'");
      }
    }
    inventory[a.id] = items.slice();
  }
  return inventory;
};

const buildLocations = (config, mission) =>
  (mission.locations || []).map((id) => {
    const loc = config.locations[id];
    if (!loc) {
      throw new Error("umbra: mission references unknown location '" + id + "'");
    }
    return loc;
  });

const buildMission = (config) => {
  if (!config.missions || config.missions.length === 0) {
    throw new Error("umbra: no missions configured");
  }
  if (!config.locations || Object.keys(config.locations).length === 0) {
    throw new Error("umbra: no locations configured");
  }

  const index = getInitialMissionIndex();
  const missionDef = config.missions[index];
  if (!missionDef) {
    throw new Error("umbra: initial mission '" + index + "' not found");
  }

  const missionLocs = new Set(missionDef.locations || []);
  const actors = buildActors(config, missionDef, missionLocs);
  const inventory = buildInventory(config, missionDef);
  const locations = buildLocations(config, missionDef);

  const mission = {
    id: missionDef.id,
    index,
    briefing: missionDef.briefing,
    start: parseDate(missionDef.start),
    deadline: parseDate(missionDef.deadline),
    actors,
    locations,
  };
  return { mission, inventory };
};

const create = (config = {}) => {
  let distMatrix = {};

  const state = {
    config,
    status: "idle",
    mission: null,
    clock: null,
    internalTime: 0,
    plans: {},
    inventory: {},
  };

  const listeners = {};
  const emit = (name, data) => { (listeners[name] || []).forEach((fn) => fn(data)); };
  const isPlaying = () => state.status === "playing";

  const api = {
    // getters
    getStatus() { return state.status; },
    getConfig() { return config; },
    getMission() { return state.mission; },
    getClock() { return state.clock; },
    getInternalTime() { return state.internalTime; },
    getActors() { return state.mission ? state.mission.actors : []; },
    getActor(id) { return findActor(state.mission, id); },
    getLocation(id) { return findLocation(state.mission, id); },
    getPlans() { return state.plans; },
    getPlan(actorId) { return state.plans[actorId] || null; },
    getInventory(actorId) { return state.inventory[actorId] || []; },
    distance(from, to) { return distanceFrom(distMatrix, from, to); },
    computeWalkTime,
    // actions
    setPlan(actorId, destination) {
      if (!isPlaying()) return false;
      const actor = findActor(state.mission, actorId);
      if (!actor) return false;
      if (!canReplacePlan(state.plans[actorId])) return false;
      state.plans[actorId] = buildPlan(actor, destination, distMatrix);
      emit("plan:set", { actorId, plan: state.plans[actorId] });
      return true;
    },
    cancelPlan(actorId) {
      if (!isPlaying()) return false;
      if (!state.plans[actorId]) return false;
      delete state.plans[actorId];
      emit("plan:cancel", { actorId });
      return true;
    },
    giveItem(fromActorId, toActorId, itemId) {
      if (!isPlaying()) return false;
      const from = findActor(state.mission, fromActorId);
      const to = findActor(state.mission, toActorId);
      if (!from || !to || from.locationId !== to.locationId) return false;
      if (!moveItem(state.inventory, fromActorId, toActorId, itemId)) return false;
      emit("item:give", { from: fromActorId, to: toActorId, itemId });
      return true;
    },
    advanceTime(minutes) {
      if (!isPlaying()) return;
      state.internalTime += minutes;
      state.clock = new Date(state.mission.start.getTime() + state.internalTime * MS_PER_MINUTE);
      emit("clock:set", { time: state.clock });
    },
    play() {
      if (!isPlaying()) return;
      let started = false;
      for (const plan of Object.values(state.plans)) {
        if (plan.startTime === null) {
          plan.startTime = state.internalTime;
          started = true;
        }
      }
      if (started) emit("plans:started", { startTime: state.internalTime });
    },
    checkPlans() {
      const completed = [];
      for (const [actorId, plan] of Object.entries(state.plans)) {
        if (plan.startTime === null) continue;
        const elapsed = state.internalTime - plan.startTime;
        if (elapsed >= plan.walkTime) {
          completed.push({ actorId, plan });
        }
      }
      return completed;
    },
    completePlan(actorId) {
      if (!isPlaying()) return false;
      const plan = state.plans[actorId];
      if (!plan) return false;
      const actor = findActor(state.mission, actorId);
      if (actor) actor.locationId = plan.destination;
      delete state.plans[actorId];
      emit("plan:done", { actorId, locationId: plan.destination });
      return true;
    },
    // events
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit,
    // lifecycle
    start() {
      if (state.status !== "idle") {
        throw new Error("umbra: game already started");
      }
      const { mission, inventory } = buildMission(config);
      distMatrix = buildDistanceMatrix(config);

      state.status = "playing";
      state.mission = mission;
      state.internalTime = 0;
      state.clock = mission.start;
      state.plans = {};
      state.inventory = inventory;

      emit("mission:start", { mission });
      emit("clock:set", { time: state.clock });
      return api;
    },
    stop() {
      if (state.status !== "playing") return api;
      state.status = "idle";
      state.mission = null;
      state.clock = null;
      state.internalTime = 0;
      state.plans = {};
      state.inventory = {};
      emit("mission:end");
      return api;
    },
  };
  return api;
};

window.Umbra = { create, baseTranslations: engineTranslations };
})();
