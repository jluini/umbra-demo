(() => {
"use strict";

const parseDate = (s) => new Date(s);
const WALKING_PACE = 10;

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
    }
  }
};

const getInitialMissionIndex = () => 0;

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

  const buildDistanceMatrix = () => {
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

    distMatrix = {};
    locs.forEach((idI, i) => {
      locs.forEach((idJ, j) => {
        distMatrix[idI] = distMatrix[idI] || {};
        distMatrix[idI][idJ] = matrix[i][j];
      });
    });
  };

  const findActor = (id) => {
    if (!state.mission) return null;
    return state.mission.actors.find((a) => a.id === id) || null;
  };

  const listeners = {};
  const api = {
    getStatus() { return state.status; },
    getConfig() { return config; },
    getMission() { return state.mission; },
    getClock() { return state.clock; },
    getInternalTime() { return state.internalTime; },
    getActors() { return state.mission ? state.mission.actors : []; },
    getActor(id) { return findActor(id); },
    getLocation(id) {
      if (!state.mission) return null;
      return state.mission.locations.find((l) => l.id === id) || null;
    },
    getPlans() { return state.plans; },
    getPlan(actorId) { return state.plans[actorId] || null; },
    getInventory(actorId) { return state.inventory[actorId] || []; },
    distance(from, to) {
      if (!distMatrix[from]) return Infinity;
      const d = distMatrix[from][to];
      return d !== undefined ? d : Infinity;
    },
    computeWalkTime(distance) {
      return Math.round(distance * WALKING_PACE);
    },
    setPlan(actorId, destination) {
      if (state.status !== "playing") return false;
      const actor = findActor(actorId);
      if (!actor) return false;
      const existing = state.plans[actorId];
      if (existing && existing.startTime !== null) return false;
      const dist = api.distance(actor.locationId, destination);
      const walkTime = Math.round(api.computeWalkTime(dist));
      state.plans[actorId] = { destination, from: actor.locationId, startTime: null, walkTime };
      api.emit("plan:set", { actorId, plan: state.plans[actorId] });
      return true;
    },
    cancelPlan(actorId) {
      if (state.status !== "playing") return false;
      if (!state.plans[actorId]) return false;
      delete state.plans[actorId];
      api.emit("plan:cancel", { actorId });
      return true;
    },
    giveItem(fromActorId, toActorId, itemId) {
      if (state.status !== "playing") return false;
      const from = findActor(fromActorId);
      const to = findActor(toActorId);
      if (!from || !to) return false;
      if (from.locationId !== to.locationId) return false;
      const fromItems = state.inventory[fromActorId];
      if (!fromItems) return false;
      const idx = fromItems.indexOf(itemId);
      if (idx === -1) return false;
      fromItems.splice(idx, 1);
      if (!state.inventory[toActorId]) state.inventory[toActorId] = [];
      state.inventory[toActorId].push(itemId);
      api.emit("item:give", { from: fromActorId, to: toActorId, itemId });
      return true;
    },
    advanceTime(minutes) {
      if (state.status !== "playing") return;
      state.internalTime += minutes;
      state.clock = new Date(state.mission.start.getTime() + state.internalTime * 60000);
      api.emit("clock:set", { time: state.clock });
    },
    play() {
      if (state.status !== "playing") return;
      let started = false;
      for (const plan of Object.values(state.plans)) {
        if (plan.startTime === null) {
          plan.startTime = state.internalTime;
          started = true;
        }
      }
      if (started) api.emit("plans:started", { startTime: state.internalTime });
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
      if (state.status !== "playing") return false;
      const plan = state.plans[actorId];
      if (!plan) return false;
      const actor = findActor(actorId);
      if (actor) actor.locationId = plan.destination;
      delete state.plans[actorId];
      api.emit("plan:done", { actorId, locationId: plan.destination });
      return true;
    },
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
    start() {
      if (state.status !== "idle") {
        throw new Error("umbra: game already started");
      }
      if (!config.levels || config.levels.length === 0) {
        throw new Error("umbra: no levels configured");
      }
      if (!config.locations || Object.keys(config.locations).length === 0) {
        throw new Error("umbra: no locations configured");
      }
      buildDistanceMatrix();

      const index = getInitialMissionIndex();
      const level = config.levels[index];
      if (!level) {
        throw new Error("umbra: initial mission '" + index + "' not found");
      }

      const levelLocs = new Set(level.locations || []);
      const actors = (level.actors || []).map((a) => {
        const base = config.actors && config.actors[a.id];
        if (!base) {
          throw new Error("umbra: actor '" + a.id + "' is not defined in config.actors");
        }
        const loc = config.locations[a.location];
        if (!loc || !levelLocs.has(a.location)) {
          throw new Error("umbra: actor '" + a.id + "' starts at '" + a.location + "' which is not in level locations");
        }
        return { ...base, locationId: a.location, items: (a.items || []).slice() };
      });

      const validItems = new Set(Object.keys(config.items || {}));
      const inventory = {};
      for (const a of level.actors || []) {
        const items = a.items || [];
        for (const itemId of items) {
          if (!validItems.has(itemId)) {
            throw new Error("umbra: actor '" + a.id + "' has unknown item '" + itemId + "'");
          }
        }
        inventory[a.id] = items.slice();
      }

      const locations = (level.locations || []).map((id) => {
        const loc = config.locations[id];
        if (!loc) {
          throw new Error("umbra: level references unknown location '" + id + "'");
        }
        return loc;
      });

      const mission = {
        id: level.id,
        index,
        name: level.name,
        briefing: level.briefing,
        start: parseDate(level.start),
        deadline: parseDate(level.deadline),
        actors,
        locations,
      };

      state.status = "playing";
      state.mission = mission;
      state.internalTime = 0;
      state.clock = mission.start;
      state.plans = {};
      state.inventory = inventory;

      api.emit("mission:start", { mission });
      api.emit("clock:set", { time: state.clock });
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
      api.emit("mission:end");
      return api;
    },
  };
  return api;
};

window.Umbra = { create, baseTranslations: engineTranslations };
})();
