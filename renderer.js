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

const languageNames = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  fr: "Français",
  it: "Italiano",
  ja: "日本語",
};

const create = ({ root }) => {
  const widgets = {};
  for (const el of root.querySelectorAll("[data-widget]")) {
    widgets[el.getAttribute("data-widget")] = el;
  }
  return {
    connect(game) {
      const renderAll = () => {
        const mission = game.state.mission;
        if (widgets.mission && mission) {
          widgets.mission.textContent =
            game.t("mission") + ": " + mission.name +
            " | " + game.t("startsAt") + ": " + formatTime(mission.start) +
            " | " + game.t("deadline") + ": " + formatTime(mission.deadline);
        }
        if (widgets.actors && mission) {
          const title = document.createElement("h3");
          title.textContent = game.t("actors") + ":";
          const list = document.createElement("ul");
          for (const actor of mission.actors) {
            const item = document.createElement("li");
            item.textContent = actor.key + ". " + actor.name;
            list.appendChild(item);
          }
          widgets.actors.replaceChildren(title, list);
        }
        if (widgets.clock && game.state.clock) {
          widgets.clock.textContent =
            game.t("clock") + ": " + formatTime(game.state.clock);
        }
      };

      if (widgets.languages) {
        const langs = game.languages();
        if (langs.length <= 1) {
          widgets.languages.style.display = "none";
        } else {
          for (const lang of langs) {
            const btn = document.createElement("button");
            btn.textContent = languageNames[lang] || lang;
            btn.addEventListener("click", () => game.setLanguage(lang));
            widgets.languages.appendChild(btn);
          }
        }
      }

      game.on("mission:start", renderAll);
      game.on("clock:set", renderAll);
      game.on("language:set", renderAll);
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
