(() => {
"use strict";

const REAL_MS_PER_GAME_MIN = 250;

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
      let selectedActor = null;
      let walkToMode = false;
      let giveMode = null;
      let playInterval = null;
      let playing = false;

      const renderInventory = () => {
        if (!widgets.inventory) return;
        if (!selectedActor || playing) {
          widgets.inventory.style.display = "none";
          return;
        }
        widgets.inventory.style.display = "";
        const mission = game.state.mission;
        const actor = mission.actors.find((a) => a.id === selectedActor);
        if (!actor) { widgets.inventory.style.display = "none"; return; }

        const plan = game.state.plans[actor.id];
        if (plan && plan.startTime !== null) {
          const destLoc = mission.locations.find((l) => l.id === plan.destination);
          const destName = destLoc ? game.resolveName(destLoc.name) : plan.destination;
          const elapsed = game.state.internalTime - plan.startTime;
          const children = [
            document.createTextNode(game.t(actor.id) + " → " + destName + " (en camino: " + elapsed + "/" + plan.walkTime + " min)")
          ];
          widgets.inventory.replaceChildren(...children);
          return;
        }

        const children = [];

        const header = document.createElement("div");
        header.textContent = game.t(actor.id) + " (" + game.resolveName(actor.location.name) + ")";
        children.push(header);

        const items = game.state.inventory[actor.id] || [];
        const othersAtLoc = mission.actors.filter((a) =>
          a.id !== actor.id &&
          a.location &&
          a.location.id === actor.location.id &&
          !(game.state.plans[a.id] && game.state.plans[a.id].startTime !== null)
        );

        if (giveMode) {
          const giveDiv = document.createElement("div");
          giveDiv.textContent = "Give " + giveMode.itemName + " to:";
          children.push(giveDiv);
          const recipientList = document.createElement("ul");
          for (const other of othersAtLoc) {
            const li = document.createElement("li");
            li.textContent = game.t(other.id);
            li.style.cursor = "pointer";
            li.addEventListener("click", () => {
              game.giveItem(actor.id, other.id, giveMode.itemId);
              giveMode = null;
              renderInventory();
              renderAll();
            });
            recipientList.appendChild(li);
          }
          children.push(recipientList);
          const cancelBtn = document.createElement("button");
          cancelBtn.textContent = "Cancelar";
          cancelBtn.addEventListener("click", () => {
            giveMode = null;
            renderInventory();
          });
          children.push(cancelBtn);
        } else if (items.length > 0) {
          const itemsDiv = document.createElement("div");
          const itemsLabel = document.createElement("span");
          itemsLabel.textContent = game.t("items") + ": ";
          itemsDiv.appendChild(itemsLabel);
          for (let i = 0; i < items.length; i++) {
            const itemId = items[i];
            const itemConfig = game.state.config.items[itemId];
            const itemName = itemConfig ? game.resolveName(itemConfig.name) : itemId;
            if (i > 0) itemsDiv.appendChild(document.createTextNode(", "));
            if (othersAtLoc.length > 0) {
              const span = document.createElement("span");
              span.textContent = itemName;
              span.style.cursor = "pointer";
              span.style.textDecoration = "underline";
              span.addEventListener("click", () => {
                giveMode = { itemId, itemName };
                renderInventory();
              });
              itemsDiv.appendChild(span);
            } else {
              itemsDiv.appendChild(document.createTextNode(itemName));
            }
          }
          children.push(itemsDiv);
        }

        if (walkToMode) {
          const walkTitle = document.createElement("div");
          walkTitle.textContent = "Walk to:";
          children.push(walkTitle);

          const locList = document.createElement("ul");
          for (const loc of mission.locations) {
            const li = document.createElement("li");
            const dist = game.distance(actor.location.id, loc.id);
            if (loc.id === actor.location.id) {
              li.textContent = game.resolveName(loc.name) + " — actual";
              li.style.color = "gray";
            } else if (dist === Infinity) {
              li.textContent = game.resolveName(loc.name) + " — sin ruta";
              li.style.color = "gray";
            } else {
              const walkTime = Math.round(game.computeWalkTime(dist));
              li.textContent = game.resolveName(loc.name) + " — " + walkTime + " min (" + dist + " km)";
              li.style.cursor = "pointer";
              li.addEventListener("click", () => {
                game.setPlan(actor.id, loc.id);
                walkToMode = false;
                renderInventory();
                renderAll();
              });
            }
            locList.appendChild(li);
          }
          children.push(locList);

          const cancelBtn = document.createElement("button");
          cancelBtn.textContent = "Cancelar";
          cancelBtn.addEventListener("click", () => {
            walkToMode = false;
            renderInventory();
          });
          children.push(cancelBtn);
        } else {
          const plan = game.state.plans[actor.id];
          if (plan && plan.startTime === null) {
            const destLoc = mission.locations.find((l) => l.id === plan.destination);
            const destName = destLoc ? game.resolveName(destLoc.name) : plan.destination;
            const planDiv = document.createElement("div");
            planDiv.textContent = "→ Walk to " + destName + " (" + plan.walkTime + " min)";
            children.push(planDiv);

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancelar";
            cancelBtn.addEventListener("click", () => {
              game.cancelPlan(actor.id);
              renderInventory();
              renderAll();
            });
            children.push(cancelBtn);
          } else {
            const walkBtn = document.createElement("button");
            walkBtn.textContent = "Walk to...";
            walkBtn.addEventListener("click", () => {
              walkToMode = true;
              giveMode = null;
              renderInventory();
            });
            children.push(walkBtn);
          }
        }

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "✕";
        closeBtn.addEventListener("click", () => {
          selectedActor = null;
          walkToMode = false;
          giveMode = null;
          renderInventory();
        });
        children.push(closeBtn);

        widgets.inventory.replaceChildren(...children);
      };

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
            const plan = game.state.plans[actor.id];
            const loc = actor.location ? " (" + game.resolveName(actor.location.name) + ")" : "";
            let planText = "";
            if (plan) {
              const destLoc = mission.locations.find((l) => l.id === plan.destination);
              const destName = destLoc ? game.resolveName(destLoc.name) : plan.destination;
              if (plan.startTime !== null) {
                const elapsed = game.state.internalTime - plan.startTime;
                planText = " → " + destName + " (en camino: " + elapsed + "/" + plan.walkTime + " min)";
              } else {
                planText = " → " + destName + " (" + plan.walkTime + " min)";
              }
            }
            item.textContent = actor.key + ". " + game.t(actor.id) + loc + planText;
            item.style.cursor = "pointer";
            item.addEventListener("click", () => {
              if (plan && plan.startTime !== null) return;
              selectedActor = actor.id;
              walkToMode = false;
              renderInventory();
            });
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
              .filter((a) => {
                if (!a.location) return false;
                const plan = game.state.plans[a.id];
                if (plan && plan.startTime !== null) return false;
                return a.location.id === loc.id;
              })
              .sort((a, b) => a.key - b.key);
            if (actorsAtLoc.length > 0) {
              const list = document.createElement("ul");
              for (const actor of actorsAtLoc) {
                const item = document.createElement("li");
                item.textContent = game.t(actor.id);
                item.style.cursor = "pointer";
                item.addEventListener("click", () => {
                  selectedActor = actor.id;
                  walkToMode = false;
                  renderInventory();
                });
                list.appendChild(item);
              }
              children.push(list);
            }
          }
          
          const inTransit = mission.actors.filter((a) => {
            const plan = game.state.plans[a.id];
            return plan && plan.startTime !== null;
          });
          if (inTransit.length > 0) {
            const transitDiv = document.createElement("div");
            transitDiv.textContent = "En tránsito:";
            children.push(transitDiv);
            const list = document.createElement("ul");
            for (const actor of inTransit) {
              const plan = game.state.plans[actor.id];
              const destLoc = mission.locations.find((l) => l.id === plan.destination);
              const destName = destLoc ? game.resolveName(destLoc.name) : plan.destination;
              const elapsed = game.state.internalTime - plan.startTime;
              const item = document.createElement("li");
              item.textContent = game.t(actor.id) + " → " + destName + " (" + elapsed + "/" + plan.walkTime + " min)";
              list.appendChild(item);
            }
            children.push(list);
          }
          
          widgets.locations.replaceChildren(...children);
        }
        if (widgets.clock && game.state.clock) {
          const clockDiv = document.createElement("div");
          clockDiv.textContent = game.t("clock") + ": " + formatTime(game.state.clock, lang);
          
          const hasPlans = Object.keys(game.state.plans).length > 0;
          if (!playing && hasPlans) {
            const playBtn = document.createElement("button");
            playBtn.textContent = "▶ Play";
            playBtn.addEventListener("click", () => {
              playing = true;
              game.play();
              renderAll();
              playInterval = setInterval(() => {
                game.advanceTime(1);
                const completed = game.checkPlans();
                if (completed.length > 0) {
                  for (const { actorId } of completed) {
                    game.completePlan(actorId);
                  }
                  playing = false;
                  clearInterval(playInterval);
                  playInterval = null;
                  selectedActor = null;
                  renderAll();
                }
              }, REAL_MS_PER_GAME_MIN);
            });
            clockDiv.appendChild(playBtn);
          }
          
          widgets.clock.textContent = "";
          widgets.clock.appendChild(clockDiv);
        }
        renderInventory();
      };

      if (widgets.inventory) {
        widgets.inventory.style.display = "none";
      }

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
