(() => {
"use strict";

const parseDate = (s) => new Date(s);
const WALKING_PACE = 10;

const engineTranslations = {
  en: { mission: "Mission", actors: "Actors", items: "Items",
        locations: "Locations",
        startsAt: "Starts at", deadline: "Deadline", clock: "Clock",
        briefing: "Briefing" },
  es: { mission: "Misión", actors: "Actores", items: "Objetos",
        locations: "Locaciones",
        startsAt: "Comienza a las", deadline: "Fecha límite", clock: "Reloj",
        briefing: "Resumen" },
  de: { mission: "Mission", actors: "Schauspieler", items: "Gegenstände",
        locations: "Orte",
        startsAt: "Beginnt um", deadline: "Frist", clock: "Uhr",
        briefing: "Lagebesprechung" },
};

const resolveName = (name, lang) =>
  typeof name === "string" ? name : (name[lang] || name.en);

const create = (opts = {}) => {
  const config = opts.config || {};
  const languages = config.languages || ["en"];
  let currentLanguage = languages[0];
  let distMatrix = {};

  const getTranslations = (lang) => ({
    ...engineTranslations[lang] || engineTranslations.en,
    ...config.translations?.[lang],
  });

  let translations = getTranslations(currentLanguage);

  const state = {
    config,
    mission: null,
    clock: null,
    internalTime: 0,
    plans: {},
    inventory: {},
    language: currentLanguage,
    translations,
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

  const listeners = {};
  const api = {
    state,
    t(key) { return translations[key] || key; },
    resolveName(name) { return resolveName(name, currentLanguage); },
    distance(from, to) {
      if (!distMatrix[from]) return Infinity;
      const d = distMatrix[from][to];
      return d !== undefined ? d : Infinity;
    },
    computeWalkTime(distance) {
      return Math.round(distance * WALKING_PACE);
    },
    setPlan(actorId, destination) {
      const actor = state.mission.actors.find((a) => a.id === actorId);
      if (!actor) return;
      const dist = api.distance(actor.location.id, destination);
      const walkTime = Math.round(api.computeWalkTime(dist));
      state.plans[actorId] = { destination, from: actor.location.id, startTime: null, walkTime };
      api.emit("plan:set", { actorId, destination });
    },
    cancelPlan(actorId) {
      delete state.plans[actorId];
      api.emit("plan:cancel", { actorId });
    },
    setLanguage(lang) {
      currentLanguage = lang;
      translations = getTranslations(lang);
      state.language = lang;
      state.translations = translations;
      api.emit("language:set", { language: lang, translations });
    },
    languages() { return languages; },
    advanceTime(minutes) {
      state.internalTime += minutes;
      state.clock = new Date(state.mission.start.getTime() + state.internalTime * 60000);
      api.emit("clock:set", { time: state.clock });
    },
    play() {
      for (const plan of Object.values(state.plans)) {
        if (plan.startTime === null) plan.startTime = state.internalTime;
      }
    },
    pause() {},
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
      const plan = state.plans[actorId];
      if (!plan) return;
      const actor = state.mission.actors.find((a) => a.id === actorId);
      if (actor) actor.location = state.config.locations[plan.destination];
      delete state.plans[actorId];
      api.emit("plan:done", { actorId });
    },
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
    start() {
      if (!config.levels || config.levels.length === 0) {
        throw new Error("umbra: no levels configured");
      }
      if (!config.locations || Object.keys(config.locations).length === 0) {
        throw new Error("umbra: no locations configured");
      }
      buildDistanceMatrix();
      const level = config.levels[0];
      const levelLocs = new Set((level.locations || []));
      const mission = {
        id: level.id,
        name: level.name,
        briefing: level.briefing,
        start: parseDate(level.start),
        deadline: parseDate(level.deadline),
        actors: level.actors.map((a) => {
          const loc = config.locations[a.location];
          if (!loc || !levelLocs.has(a.location)) {
            throw new Error("umbra: actor '" + a.id + "' starts at '" + a.location + "' which is not in level locations");
          }
          return { ...config.actors[a.id], location: loc };
        }),
        locations: (level.locations || []).map((id) => config.locations[id]),
      };
      const validItems = new Set(Object.keys(config.items || {}));
      state.inventory = {};
      for (const a of level.actors) {
        const items = a.items || [];
        for (const itemId of items) {
          if (!validItems.has(itemId)) {
            throw new Error("umbra: actor '" + a.id + "' has unknown item '" + itemId + "'");
          }
        }
        state.inventory[a.id] = items.slice();
      }
      state.mission = mission;
      state.internalTime = 0;
      state.clock = mission.start;
      api.emit("mission:start", { mission });
      api.emit("clock:set", { time: state.clock });
      return api;
    },
    stop() {
      state.mission = null;
      state.clock = null;
      api.emit("mission:end");
      return api;
    },
  };
  return api;
};

window.Umbra = { create };
})();
