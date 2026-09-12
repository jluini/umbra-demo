(() => {
"use strict";

const dom = {
  listen(instance) {
    instance.on("render", (level) => {
      const container = instance.state.container;
      if (level === null) { container.replaceChildren(); return; }
      const actors = level.actors.map((id) => instance.state.config.actors[id]);
      const box = document.createElement("div");
      box.style.border = "1px solid black";
      box.style.padding = "8px";
      const title = document.createElement("h2");
      title.textContent = level.name;
      const start = document.createElement("p");
      start.textContent = "Starts at " + level.start;
      const list = document.createElement("ul");
      for (const actor of actors) {
        const item = document.createElement("li");
        item.textContent = actor.key + ". " + actor.name;
        list.appendChild(item);
      }
      box.append(title, start, list);
      container.replaceChildren(box);
    });
  },
};

const create = (opts = {}) => {
  const state = {
    config: opts.config,
    container: document.querySelector(opts.container),
    level: null,
  };
  const listeners = {};
  const api = {
    state,
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
    start() {
      if (!state.config.levels || state.config.levels.length === 0) {
        throw new Error("umbra: no levels configured");
      }
      state.level = state.config.levels[0];
      api.emit("render", state.level);
      return api;
    },
    stop() {
      state.level = null;
      api.emit("render", null);
      return api;
    },
  };
  dom.listen(api);
  return api;
};

window.Umbra = { create };
})();
