(() => {
"use strict";

// Javascript-specific functions
const parseDate = (s) => new Date(s);

const create = (opts = {}) => {
  const config = opts.config || {};
  const state = {
    config,
    mission: null,
    clock: null,
  };
  const listeners = {};
  const api = {
    state,
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
