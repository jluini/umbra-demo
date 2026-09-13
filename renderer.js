(() => {
"use strict";

const formatTime = (date, lang) =>
  new Intl.DateTimeFormat(lang, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

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
        const lang = game.state.language;
        const mission = game.state.mission;
        if (widgets.mission && mission) {
          const header = document.createElement("div");
          header.textContent =
            game.t("mission") + ": " + game.resolveName(mission.name) +
            " | " + game.t("startsAt") + ": " + formatTime(mission.start, lang) +
            " | " + game.t("deadline") + ": " + formatTime(mission.deadline, lang);
          const children = [header];
          if (mission.briefing) {
            const p = document.createElement("p");
            p.textContent = game.t("briefing") + ": " + game.resolveName(mission.briefing);
            children.push(p);
          }
          widgets.mission.replaceChildren(...children);
        }
        if (widgets.actors && mission) {
          const title = document.createElement("h3");
          title.textContent = game.t("actors") + ":";
          const list = document.createElement("ul");
          for (const actor of mission.actors) {
            const item = document.createElement("li");
            const loc = actor.location ? " (" + game.resolveName(actor.location.name) + ")" : "";
            item.textContent = actor.key + ". " + game.t(actor.id) + loc;
            list.appendChild(item);
          }
          widgets.actors.replaceChildren(title, list);
        }
        if (widgets.locations && mission) {
          const title = document.createElement("h3");
          title.textContent = game.t("locations") + ":";
          const children = [title];
          for (const loc of mission.locations) {
            const subtitle = document.createElement("h4");
            subtitle.textContent = game.resolveName(loc.name);
            children.push(subtitle);
            const actorsAtLoc = mission.actors
              .filter((a) => a.location && a.location.id === loc.id)
              .sort((a, b) => a.key - b.key);
            if (actorsAtLoc.length > 0) {
              const list = document.createElement("ul");
              for (const actor of actorsAtLoc) {
                const item = document.createElement("li");
                item.textContent = game.t(actor.id);
                list.appendChild(item);
              }
              children.push(list);
            }
          }
          widgets.locations.replaceChildren(...children);
        }
        if (widgets.clock && game.state.clock) {
          widgets.clock.textContent =
            game.t("clock") + ": " + formatTime(game.state.clock, lang);
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
