(() => {
"use strict";

const formatTime = (date) =>
  date.toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const create = ({ root }) => {
  const widgets = {};
  for (const el of root.querySelectorAll("[data-widget]")) {
    widgets[el.getAttribute("data-widget")] = el;
  }
  return {
    connect(game) {
      game.on("mission:start", ({ mission }) => {
        if (widgets.mission) {
          widgets.mission.textContent =
            "Mission: " + mission.name +
            " | Starts at: " + formatTime(mission.start) +
            " | Deadline: " + formatTime(mission.deadline);
        }
        if (widgets.actors) {
          const list = document.createElement("ul");
          for (const actor of mission.actors) {
            const item = document.createElement("li");
            item.textContent = actor.key + ". " + actor.name;
            list.appendChild(item);
          }
          widgets.actors.replaceChildren(list);
        }
      });
      game.on("clock:set", ({ time }) => {
        if (widgets.clock) {
          widgets.clock.textContent = "Clock: " + formatTime(time);
        }
      });
      game.on("mission:end", () => {
        for (const el of Object.values(widgets)) {
          el.replaceChildren();
        }
      });
    },
  };
};

window.Renderer = { create };
})();