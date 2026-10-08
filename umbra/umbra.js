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
      abort: "Abort",
      restart: "Restart mission",
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
      abort: "Abortar",
      restart: "Reiniciar misión",
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
      abort: "Aufgeben",
      restart: "Mission neu starten",
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

const findTrade = (mission, locationId, tradeId) =>
  (findLocation(mission, locationId)?.trades || {})[tradeId] || null;

const buildPlan = (actor, destination, matrix, mean, travelTime) => ({
  destination,
  mean,
  duration: travelTime(distanceFrom(matrix, actor.activity.at, destination), mean),
});

const moveItem = (fromActor, toActor, item, quantity = 1) => {
  if (!Number.isInteger(quantity) || quantity < 1) return false;
  const available = fromActor.items.filter((it) => it.id === item.id).length;
  if (available < quantity) return false;
  let removed = 0;
  for (let i = fromActor.items.length - 1; i >= 0 && removed < quantity; i--) {
    if (fromActor.items[i].id === item.id) {
      fromActor.items.splice(i, 1);
      removed++;
    }
  }
  for (let i = 0; i < quantity; i++) toActor.items.push(item);
  return true;
};

const countItem = (actor, itemId) => actor.items.filter((it) => it.id === itemId).length;

const removeItems = (actor, itemId, quantity) => {
  let removed = 0;
  for (let i = actor.items.length - 1; i >= 0 && removed < quantity; i--) {
    if (actor.items[i].id === itemId) {
      actor.items.splice(i, 1);
      removed++;
    }
  }
  return removed === quantity;
};

const addItems = (actor, item, quantity) => {
  for (let i = 0; i < quantity; i++) actor.items.push(item);
};

// Items have a `carry` policy: "required" (default, must be carried by an actor),
// "optional" (actor or location) or "none" (lives in a location). Stackable items
// can only be "required".
const CARRY_VALUES = ["required", "optional", "none"];
const itemCarry = (item) => (item && item.carry) || "required";
const validateItems = (config) => {
  for (const [id, item] of Object.entries(config.items || {})) {
    if (item.carry !== undefined && !CARRY_VALUES.includes(item.carry)) {
      throw new Error("umbra: item '" + id + "' has invalid 'carry' (expected 'required', 'optional' or 'none')");
    }
    if (item.stackable && itemCarry(item) !== "required") {
      throw new Error("umbra: item '" + id + "' is stackable, so its 'carry' must be 'required'");
    }
  }
};

const expandItems = (config, actorId, entries) => {
  const items = [];
  for (const entry of entries || []) {
    let id;
    let quantity;
    const preset = typeof entry === "string" ? config.items[entry] : undefined;
    if (preset) {
      if (preset.stackable) {
        throw new Error("umbra: actor '" + actorId + "' must give a quantity for stackable item '" + entry + "' (e.g. '" + entry + ":10')");
      }
      id = entry;
      quantity = 1;
    } else {
      const sep = typeof entry === "string" ? entry.lastIndexOf(":") : -1;
      if (sep === -1) {
        throw new Error("umbra: actor '" + actorId + "' has unknown item '" + entry + "'");
      }
      id = entry.slice(0, sep);
      const quantityText = entry.slice(sep + 1);
      if (!/^[0-9]+$/.test(quantityText)) {
        throw new Error("umbra: actor '" + actorId + "' has an invalid quantity in '" + entry + "'");
      }
      const item = config.items[id];
      if (!item) {
        throw new Error("umbra: actor '" + actorId + "' has unknown item '" + id + "'");
      }
      if (!item.stackable) {
        throw new Error("umbra: actor '" + actorId + "' cannot give a quantity for non-stackable item '" + id + "'");
      }
      quantity = Number(quantityText);
      if (quantity < 1) {
        throw new Error("umbra: actor '" + actorId + "' has an invalid quantity in '" + entry + "'");
      }
    }
    for (let i = 0; i < quantity; i++) items.push(config.items[id]);
  }
  return items;
};

// Items lying loose in a location. Only "optional"/"none" items may be loose,
// and locations hold no quantities.
const expandLocationItems = (config, locationId, entries) => {
  const items = [];
  for (const entry of entries || []) {
    const id = typeof entry === "string" ? entry : (entry && entry.id);
    const item = id ? config.items[id] : undefined;
    if (!item) {
      throw new Error("umbra: location '" + locationId + "' has unknown item '" + entry + "'");
    }
    if (itemCarry(item) === "required") {
      throw new Error("umbra: location '" + locationId + "' cannot hold item '" + id + "' (carry must be 'optional' or 'none')");
    }
    items.push(item);
  }
  return items;
};

// Config collections keyed by id: the key is the id, so entries must not carry
// their own 'id'. It is injected here into the processed objects.
const injectIds = (map) => {
  const out = {};
  for (const [id, def] of Object.entries(map || {})) {
    if (Object.prototype.hasOwnProperty.call(def, "id")) {
      throw new Error("umbra: config entry '" + id + "' must not define 'id' (the key is the id)");
    }
    out[id] = { ...def, id };
  }
  return out;
};

const buildActors = (config, mission, missionLocs) => {
  return Object.entries(mission.actors || {}).map(([id, entry]) => {
    if (Object.prototype.hasOwnProperty.call(entry, "id")) {
      throw new Error("umbra: actor '" + id + "' must not define 'id' (the key is the id)");
    }
    const preset = config.actors && config.actors[id];
    if (!preset) {
      throw new Error("umbra: actor '" + id + "' is not defined in config.actors");
    }
    const loc = config.locations[entry.location];
    if (!loc || !missionLocs.has(entry.location)) {
      throw new Error("umbra: actor '" + id + "' starts at '" + entry.location + "' which is not in mission locations");
    }
    const items = expandItems(config, id, entry.items);
    return { id, preset, activity: { kind: "idle", at: entry.location }, items };
  });
};

// A mission selects locations keyed by id and may override/augment any field of
// the game-level location definition (shallow spread: the mission entry wins).
// The key is the id, so entries must not carry their own 'id'. A location's
// `trades` is likewise a map keyed by trade id (also normalized here).
const buildLocations = (config, missionDef) =>
  Object.entries(missionDef.locations || {}).map(([id, override]) => {
    if (Object.prototype.hasOwnProperty.call(override, "id")) {
      throw new Error("umbra: mission location '" + id + "' must not define 'id' (the key is the id)");
    }
    const base = config.locations[id];
    if (!base) {
      throw new Error("umbra: mission references unknown location '" + id + "'");
    }
    const location = { ...base, ...override, id };
    if (location.trades !== undefined) {
      if (location.trades === null || typeof location.trades !== "object" || Array.isArray(location.trades)) {
        throw new Error("umbra: location '" + id + "' has invalid 'trades' (must be an object keyed by trade id)");
      }
      location.trades = injectIds(location.trades);
    }
    if (location.items !== undefined) {
      if (!Array.isArray(location.items)) {
        throw new Error("umbra: location '" + id + "' has invalid 'items' (must be an array of item ids)");
      }
      location.items = expandLocationItems(config, id, location.items);
    }
    return location;
  });

// --- Trades ---------------------------------------------------------------
// A location of a mission may define `trades`: a map keyed by trade id of
// { cost: [{ item, quantity }], reward: [{ item, quantity }], label? }.

const validateTradeItems = (itemIds, locationId, tradeId, field, entries) => {
  if (!Array.isArray(entries)) {
    throw new Error("umbra: trade '" + tradeId + "' in location '" + locationId + "' has invalid '" + field + "'");
  }
  for (const entry of entries) {
    const itemId = entry && entry.item;
    if (!itemIds.has(itemId)) {
      throw new Error("umbra: trade '" + tradeId + "' references unknown item '" + itemId + "'");
    }
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
      throw new Error("umbra: trade '" + tradeId + "' has an invalid quantity for item '" + itemId + "'");
    }
  }
};

const validateTrades = (config, locations) => {
  const itemIds = new Set(Object.keys(config.items || {}));
  for (const location of locations) {
    if (location.trades === undefined) continue;
    for (const [tradeId, trade] of Object.entries(location.trades)) {
      validateTradeItems(itemIds, location.id, tradeId, "cost", trade.cost);
      validateTradeItems(itemIds, location.id, tradeId, "reward", trade.reward);
    }
  }
};

// --- Rules / conditions ---------------------------------------------------
// A rule is { effect, conditions: [...], message? }. Conditions are combined
// with AND; rules of the same effect are combined with OR (config order).
// Effects are evaluated by precedence: defeat before victory.

const EFFECT_PRIORITY = ["defeat", "victory"];

const actorLocation = (actor) => actor.activity.at;

const itemAt = ({ item, at }, mission) => {
  const location = findLocation(mission, at);
  if (location && (location.items || []).some((it) => it.id === item)) return true;
  return mission.actors.some((actor) =>
    actorLocation(actor) === at && actor.items.some((it) => it.id === item));
};

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
  const actorIds = new Set(Object.keys(missionDef.actors || {}));
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

  const missionLocs = new Set(Object.keys(missionDef.locations || {}));
  const actors = buildActors(config, missionDef, missionLocs);
  const locations = buildLocations(config, missionDef);
  validateTrades(config, locations);
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
  config = {
    ...config,
    actors: injectIds(config.actors),
    items: injectIds(config.items),
    locations: injectIds(config.locations),
    means: injectIds(config.means),
    missions: Object.values(injectIds(config.missions)),
  };
  validateItems(config);
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

  // Means (transport modes): available when the actor holds every required item
  // and has every required skill. A mean without an explicit skills list requires
  // a single skill named after its id with the last "_segment" stripped
  // (e.g. "walk" -> "walk", "car_2" -> "car").
  const meansOf = () => config.means || {};
  const defaultSkill = (id) => id.replace(/_[^_]*$/, "");
  const requiredSkills = (id, def) => (Array.isArray(def.skills) ? def.skills : [defaultSkill(id)]);
  const actorHasMean = (actor, id) => {
    const def = meansOf()[id];
    if (!def) return false;
    const itemsOk = (def.items || []).every((itemId) => countItem(actor, itemId) > 0);
    const skills = actor.preset.skills || [];
    const skillsOk = requiredSkills(id, def).every((skill) => skills.includes(skill));
    return itemsOk && skillsOk;
  };
  const availableMeans = (actor) =>
    Object.entries(meansOf())
      .filter(([id]) => actorHasMean(actor, id))
      .map(([id, def]) => ({ id, icon: def.icon, pace: def.pace }));
  const computeTravelTime = (distance, meanId) => {
    const def = meansOf()[meanId];
    const pace = def && typeof def.pace === "number" ? def.pace : WALKING_PACE;
    return Math.round(distance * pace);
  };
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

  const evaluateTrade = (actorId, locationId, tradeId) => {
    if (!isRunning()) return { ok: false, reason: "notRunning" };
    const actor = findActor(state.mission, actorId);
    if (!actor) return { ok: false, reason: "unknownActor" };
    if (actor.activity.kind !== "idle") return { ok: false, reason: "busy" };
    if (actor.activity.at !== locationId) return { ok: false, reason: "notHere" };
    const trade = findTrade(state.mission, locationId, tradeId);
    if (!trade) return { ok: false, reason: "unknown" };
    for (const entry of trade.cost) {
      if (countItem(actor, entry.item) < entry.quantity) return { ok: false, reason: "missingCost" };
    }
    return { ok: true };
  };

  const commitPlans = () => {
    if (!isRunning()) return false;
    let started = false;
    for (const [actorId, plan] of Object.entries(state.plans)) {
      const actor = findActor(state.mission, actorId);
      if (!actor) continue;
      actor.activity = {
        kind: "transit",
        mean: plan.mean,
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
    getItemCount(actorId, itemId) {
      const actor = findActor(state.mission, actorId);
      if (!actor) return 0;
      return countItem(actor, itemId);
    },
    getItemGroups(actorId) {
      const actor = findActor(state.mission, actorId);
      if (!actor) return [];
      const groups = [];
      const index = {};
      for (const item of actor.items) {
        if (index[item.id] === undefined) {
          index[item.id] = groups.length;
          groups.push({ item, count: 0 });
        }
        groups[index[item.id]].count += 1;
      }
      return groups;
    },
    getTrades(locationId) {
      const location = findLocation(state.mission, locationId);
      return location && location.trades ? Object.values(location.trades) : [];
    },
    distance(from, to) { return distanceFrom(distMatrix, from, to); },
    computeTravelTime,
    getMean(meanId) { return meansOf()[meanId] || null; },
    getAvailableMeans(actorId) {
      const actor = findActor(state.mission, actorId);
      return actor ? availableMeans(actor) : [];
    },
    // actions
    setPlan(actorId, destination, meanId) {
      if (!isRunning()) return false;
      const actor = findActor(state.mission, actorId);
      if (!actor || actor.activity.kind !== "idle") return false;
      if (!findLocation(state.mission, destination)) return false;
      const means = availableMeans(actor);
      const mean = meanId || (means[0] && means[0].id);
      if (!means.some((m) => m.id === mean)) return false;
      state.plans[actorId] = buildPlan(actor, destination, distMatrix, mean, computeTravelTime);
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
    giveItem(fromActorId, toActorId, item, quantity = 1) {
      if (!isRunning()) return false;
      const from = findActor(state.mission, fromActorId);
      const to = findActor(state.mission, toActorId);
      if (!from || !to) return false;
      // TODO: sólo actores idle pueden dar/recibir items; en el futuro un actor "at" podría recibir items incluso no estando idle?
      if (from.activity.kind !== "idle" || to.activity.kind !== "idle") return false;
      if (from.activity.at !== to.activity.at) return false;
      if (!moveItem(from, to, item, quantity)) return false;
      emit("item:give", { from: fromActorId, to: toActorId, item, quantity });
      // Rules are only evaluated when a plan completes. If item transfers should
      // be able to end the mission, evaluate here:
      // const ending = evaluateRules(state.mission.rules, state.mission);
      // if (ending) endMission({ ...ending, reason: "rule" }, { completed: [], ended: null });
      return true;
    },
    canTrade(actorId, locationId, tradeId) {
      return evaluateTrade(actorId, locationId, tradeId);
    },
    trade(actorId, locationId, tradeId) {
      if (!evaluateTrade(actorId, locationId, tradeId).ok) return false;
      const actor = findActor(state.mission, actorId);
      const trade = findTrade(state.mission, locationId, tradeId);
      for (const entry of trade.cost) removeItems(actor, entry.item, entry.quantity);
      for (const entry of trade.reward) addItems(actor, config.items[entry.item], entry.quantity);
      emit("item:trade", { actorId, locationId, tradeId });
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
