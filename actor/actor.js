(() => {
"use strict";

const create = (opts = {}) => {
  const container = opts.container;
  const api = {
    on() {},
    emit() {},
    start() {},
    stop() {},
  };
  return api;
};

window.Actor = { create };
})();
