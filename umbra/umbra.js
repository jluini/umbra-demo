(() => {
"use strict";

const parseDate = (s) => new Date(s);

const engineTranslations = {
  en: { mission: "Mission", actors: "Actors", items: "Items",
        startsAt: "Starts at", deadline: "Deadline", clock: "Clock" },
  es: { mission: "Misión", actors: "Actores", items: "Objetos",
        startsAt: "Comienza a las", deadline: "Fecha límite", clock: "Reloj" },
  de: { mission: "Mission", actors: "Schauspieler", items: "Gegenstände",
        startsAt: "Beginnt um", deadline: "Frist", clock: "Uhr" },
};

const resolveName = (name, lang) =>
  typeof name === "string" ? name : (name[lang] || name.en);

const create = (opts = {}) => {
  const config = opts.config || {};
  const languages = config.languages || ["en"];
  let currentLanguage = languages[0];

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

  const listeners = {};
  const api = {
    state,
    t(key) { return translations[key] || key; },
    resolveName(name) { return resolveName(name, currentLanguage); },
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
      const level = config.levels[0];
      const mission = {
        id: level.id,
        name: level.name,
        start: parseDate(level.start),
        deadline: parseDate(level.deadline),
        actors: level.actors.map((id) => config.actors[id]),
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
