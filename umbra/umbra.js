(() => {
"use strict";

const parseDate = (s) => new Date(s);

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
      return (distMatrix[from] && distMatrix[from][to]) || Infinity;
    },
    setLanguage(lang) {
      currentLanguage = lang;
      translations = getTranslations(lang);
      state.language = lang;
      state.translations = translations;
      api.emit("language:set", { language: lang, translations });
    },
    languages() { return languages; },
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
      const mission = {
        id: level.id,
        name: level.name,
        briefing: level.briefing,
        start: parseDate(level.start),
        deadline: parseDate(level.deadline),
        actors: level.actors.map((id) => config.actors[id]),
        locations: (level.locations || []).map((id) => config.locations[id]),
      };
      state.mission = mission;
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
