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
    /* TODO: menu, plan, actions namespaces could belong to the UI */
    menu: {
      play: "Play",
      continue: "Continue",
      credits: "Credits",
      about: "About"
    },
    plan: {
      walkTo: "Walk to...",
      cancel: "Cancel",
      inTransit: "In transit"
    },
    actions: {
      run: "Run"
    },
    messages: {
      defeat: {
        deadline: "Time has run out."
      }
    },
    /* TODO: briefingLabels namespace could belong to the game */
    briefingLabels: {
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
    plan: {
      walkTo: "Caminar a...",
      cancel: "Cancelar",
      inTransit: "En tránsito"
    },
    actions: {
      run: "Avanzar"
    },
    messages: {
      defeat: {
        deadline: "Se ha agotado el tiempo"
      }
    },
    briefingLabels: {
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
    plan: {
      walkTo: "Gehen zu...",
      cancel: "Abbrechen",
      inTransit: "Unterwegs"
    },
    actions: {
      run: "Ausführen"
    },
    messages: {
      defeat: {
        deadline: "Die Zeit ist abgelaufen."
      }
    },
    briefingLabels: {
      goal: "Ziel",
      hints: "Hinweise"
    },
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

const buildPlan = (actor, destination, matrix) => ({
  destination,
  duration: computeWalkTime(distanceFrom(matrix, actor.activity.at, destination)),
});

const moveItem = (fromActor, toActor, item) => {
  const idx = fromActor.items.indexOf(item);
  if (idx === -1) return false;
  fromActor.items.splice(idx, 1);
  toActor.items.push(item);
  return true;
};

const buildActors = (config, mission, missionLocs) => {
  const validItems = new Set(Object.keys(config.items || {}));
  return (mission.actors || []).map((a) => {
    const preset = config.actors && config.actors[a.id];
    if (!preset) {
      throw new Error("umbra: actor '" + a.id + "' is not defined in config.actors");
    }
    const loc = config.locations[a.location];
    if (!loc || !missionLocs.has(a.location)) {
      throw new Error("umbra: actor '" + a.id + "' starts at '" + a.location + "' which is not in mission locations");
    }
    const items = (a.items || []).map((id) => {
      if (!validItems.has(id)) {
        throw new Error("umbra: actor '" + a.id + "' has unknown item '" + id + "'");
      }
      return config.items[id];
    });
    return { id: a.id, preset, activity: { kind: "idle", at: a.location }, items };
  });
};

const buildLocations = (config, mission) =>
  (mission.locations || []).map((id) => {
    const loc = config.locations[id];
    if (!loc) {
      throw new Error("umbra: mission references unknown location '" + id + "'");
    }
    return loc;
  });

// --- Rules / conditions ---------------------------------------------------
// A rule is { effect, conditions: [...], message? }. Conditions are combined
// with AND; rules of the same effect are combined with OR (config order).
// Effects are evaluated by precedence: defeat before victory.

const EFFECT_PRIORITY = ["defeat", "victory"];

const actorLocation = (actor) => actor.activity.at;

const itemAt = ({ item, at }, mission) =>
  mission.actors.some((actor) =>
    actorLocation(actor) === at && actor.items.some((it) => it.id === item));

const actorsAt = ({ actors, at, exact }, mission) => {
  const present = mission.actors.filter((actor) => actorLocation(actor) === at);
  if (!actors.every((id) => present.some((actor) => actor.id === id))) return false;
  if (exact && present.some((actor) => !actors.includes(actor.id))) return false;
  return true;
};

const actorsTogether = ({ actors }, mission) => {
  const positions = actors.map((id) => {
    const actor = findActor(mission, id);
    return actor ? actorLocation(actor) : undefined;
  });
  if (positions.some((p) => p === undefined)) return false;
  return positions.every((p) => p === positions[0]);
};

const conditionHolds = (condition, mission) => {
  switch (condition.kind) {
    case "itemAt": return itemAt(condition, mission);
    case "actorsAt": return actorsAt(condition, mission);
    case "actorsTogether": return actorsTogether(condition, mission);
    default:
      throw new Error("umbra: unknown condition kind '" + condition.kind + "'");
  }
};

const conditionsHold = (conditions, mission) =>
  conditions.every((condition) => conditionHolds(condition, mission));

const evaluateRules = (rules, mission) => {
  for (const effect of EFFECT_PRIORITY) {
    for (const rule of rules) {
      if (rule.effect !== effect) continue;
      if (conditionsHold(rule.conditions, mission)) {
        return { effect, message: rule.message !== undefined ? rule.message : null };
      }
    }
  }
  return null;
};

const validateRules = (config, missionDef, missionLocs) => {
  const rules = missionDef.rules || [];
  const actorIds = new Set((missionDef.actors || []).map((a) => a.id));
  const itemIds = new Set(Object.keys(config.items || {}));

  const checkActorsCondition = (condition) => {
    if (!Array.isArray(condition.actors) || condition.actors.length === 0) {
      throw new Error("umbra: rule condition '" + condition.kind + "' requires a non-empty 'actors' array");
    }
    for (const id of condition.actors) {
      if (!actorIds.has(id)) {
        throw new Error("umbra: rule condition references unknown actor '" + id + "'");
      }
    }
  };

  for (const rule of rules) {
    if (!EFFECT_PRIORITY.includes(rule.effect)) {
      throw new Error("umbra: rule has unknown effect '" + rule.effect + "'");
    }
    if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      throw new Error("umbra: rule '" + rule.effect + "' has no conditions");
    }
    for (const condition of rule.conditions) {
      switch (condition.kind) {
        case "itemAt":
          if (!itemIds.has(condition.item)) {
            throw new Error("umbra: rule condition references unknown item '" + condition.item + "'");
          }
          if (!missionLocs.has(condition.at)) {
            throw new Error("umbra: rule condition references unknown location '" + condition.at + "'");
          }
          break;
        case "actorsAt":
          checkActorsCondition(condition);
          if (!missionLocs.has(condition.at)) {
            throw new Error("umbra: rule condition references unknown location '" + condition.at + "'");
          }
          break;
        case "actorsTogether":
          checkActorsCondition(condition);
          break;
        default:
          throw new Error("umbra: rule condition has unknown kind '" + condition.kind + "'");
      }
    }
  }
  return rules;
};

const buildMission = (config, requestedIndex = getInitialMissionIndex()) => {
  if (!config.missions || config.missions.length === 0) {
    throw new Error("umbra: no missions configured");
  }
  if (!config.locations || Object.keys(config.locations).length === 0) {
    throw new Error("umbra: no locations configured");
  }

  const index = config.missions[requestedIndex] ? requestedIndex : getInitialMissionIndex();
  const missionDef = config.missions[index];
  if (!missionDef) {
    throw new Error("umbra: initial mission '" + index + "' not found");
  }

  const missionLocs = new Set(missionDef.locations || []);
  const actors = buildActors(config, missionDef, missionLocs);
  const locations = buildLocations(config, missionDef);
  const rules = validateRules(config, missionDef, missionLocs);

  const mission = {
    id: missionDef.id,
    index,
    briefing: missionDef.briefing,
    start: parseDate(missionDef.start),
    deadline: parseDate(missionDef.deadline),
    actors,
    locations,
    rules,
  };
  return { mission };
};

const create = (config = {}) => {
  let distMatrix = {};

  const state = {
    config,
    status: "ready",
    mission: null,
    clock: null,
    internalTime: 0,
    deadlineTime: 0,
    ending: null,
    plans: {},
  };

  const listeners = {};
  const emit = (name, data) => { (listeners[name] || []).forEach((fn) => fn(data)); };
  const isRunning = () => state.status === "running";

  const isInProgress = (activity) => activity.duration !== undefined;
  const hasActiveActivities = () =>
    state.mission ? state.mission.actors.some((a) => isInProgress(a.activity)) : false;

  const completeFinishedPlans = () => {
    const completed = [];
    for (const actor of state.mission.actors) {
      if (!isInProgress(actor.activity)) continue;
      const elapsed = state.internalTime - actor.activity.startedAt;
      if (elapsed >= actor.activity.duration) {
        const locationId = actor.activity.to;
        actor.activity = { kind: "idle", at: locationId };
        completed.push({ actorId: actor.id, locationId });
      }
    }
    return completed;
  };

  const endMission = (ending, result) => {
    state.status = "ended";
    state.ending = ending;
    result.ended = ending;
    emit("mission:end", ending);
    return result;
  };

  const commitPlans = () => {
    if (!isRunning()) return false;
    let started = false;
    for (const [actorId, plan] of Object.entries(state.plans)) {
      const actor = findActor(state.mission, actorId);
      if (!actor) continue;
      actor.activity = {
        kind: "transit",
        vehicle: "walk",
        from: actor.activity.at,
        to: plan.destination,
        startedAt: state.internalTime,
        duration: plan.duration,
      };
      delete state.plans[actorId];
      started = true;
    }
    if (started) emit("plans:started", { startTime: state.internalTime });
    return started;
  };

  const api = {
    // getters
    getStatus() { return state.status; },
    getEnding() { return state.ending; },
    getConfig() { return config; },
    getMission() { return state.mission; },
    getClock() { return state.clock; },
    getInternalTime() { return state.internalTime; },
    getActors() { return state.mission ? state.mission.actors : []; },
    getActor(id) { return findActor(state.mission, id); },
    getLocation(id) { return findLocation(state.mission, id); },
    getPlans() { return state.plans; },
    getPlan(actorId) { return state.plans[actorId] || null; },
    canAdvance() {
      if (!isRunning()) return false;
      if (Object.keys(state.plans).length > 0) return true;
      return hasActiveActivities();
    },
    getInventory(actorId) {
      const actor = findActor(state.mission, actorId);
      return actor ? actor.items : [];
    },
    distance(from, to) { return distanceFrom(distMatrix, from, to); },
    computeWalkTime,
    // actions
    setPlan(actorId, destination) {
      if (!isRunning()) return false;
      const actor = findActor(state.mission, actorId);
      if (!actor || actor.activity.kind !== "idle") return false;
      if (!findLocation(state.mission, destination)) return false;
      state.plans[actorId] = buildPlan(actor, destination, distMatrix);
      emit("plan:set", { actorId, plan: state.plans[actorId] });
      return true;
    },
    cancelPlan(actorId) {
      if (!isRunning()) return false;
      if (!state.plans[actorId]) return false;
      delete state.plans[actorId];
      emit("plan:cancel", { actorId });
      return true;
    },
    giveItem(fromActorId, toActorId, item) {
      if (!isRunning()) return false;
      const from = findActor(state.mission, fromActorId);
      const to = findActor(state.mission, toActorId);
      if (!from || !to) return false;
      // TODO: sólo actores idle pueden dar/recibir items; en el futuro un actor "at" podría recibir items incluso no estando idle?
      if (from.activity.kind !== "idle" || to.activity.kind !== "idle") return false;
      if (from.activity.at !== to.activity.at) return false;
      if (!moveItem(from, to, item)) return false;
      emit("item:give", { from: fromActorId, to: toActorId, item });
      // Rules are only evaluated when a plan completes. If item transfers should
      // be able to end the mission, evaluate here:
      // const ending = evaluateRules(state.mission.rules, state.mission);
      // if (ending) endMission({ ...ending, reason: "rule" }, { completed: [], ended: null });
      return true;
    },
    advance() {
      const result = { completed: [], ended: null };
      if (!isRunning()) return result;

      // Commit any pending plans so time never advances with unstarted plans.
      commitPlans();

      if (!hasActiveActivities()) return result;

      state.internalTime += 1;
      state.clock = new Date(state.mission.start.getTime() + state.internalTime * MS_PER_MINUTE);
      emit("clock:set", { time: state.clock });

      result.completed = completeFinishedPlans();
      if (result.completed.length > 0) {
        emit("plans:completed", { completed: result.completed });
      }

      if (state.internalTime >= state.deadlineTime) {
        // TODO: clave i18n hardcodeada
        return endMission({ effect: "defeat", message: "messages.defeat.deadline", reason: "deadline" }, result);
      }

      if (result.completed.length > 0) {
        const ending = evaluateRules(state.mission.rules, state.mission);
        if (ending) return endMission({ ...ending, reason: "rule" }, result);
      }

      return result;
    },
    // commitPlans, // re-expose if a host needs to start the turn without advancing
    // events
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit,
    // lifecycle
    start(missionIndex) {
      if (state.status !== "ready") {
        throw new Error("umbra: game already started");
      }
      const { mission } = buildMission(config, missionIndex);
      distMatrix = buildDistanceMatrix(config);

      state.status = "running";
      state.mission = mission;
      state.internalTime = 0;
      state.clock = mission.start;
      state.deadlineTime = (mission.deadline.getTime() - mission.start.getTime()) / MS_PER_MINUTE;
      state.ending = null;
      state.plans = {};

      emit("mission:start", { mission });
      emit("clock:set", { time: state.clock });
      return api;
    },
    stop() {
      if (state.status === "ready") return api;
      state.status = "ready";
      state.mission = null;
      state.clock = null;
      state.internalTime = 0;
      state.deadlineTime = 0;
      state.ending = null;
      state.plans = {};
      emit("mission:reset");
      return api;
    },
  };
  return api;
};

window.Umbra = { create, baseTranslations: engineTranslations };
})();
