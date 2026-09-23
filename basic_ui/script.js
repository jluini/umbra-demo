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

//const create = ({ root }) => {
  const widgets = {};
  const root = document.getElementById("app");

  for (const el of root.querySelectorAll("[data-widget]")) {
    widgets[el.getAttribute("data-widget")] = el;
  }
  //return {
    function connect(game) {
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
        const mission = game.getMission();
        const actor = mission.actors.find((a) => a.id === selectedActor);
        if (!actor) { widgets.inventory.style.display = "none"; return; }

        const plan = game.getPlans()[actor.id];
        if (plan && plan.startTime !== null) {
          const destLoc = mission.locations.find((l) => l.id === plan.destination);
          const destName = destLoc ? resolveName(destLoc.name) : plan.destination;
          const elapsed = game.state.internalTime - plan.startTime;
          const children = [
            document.createTextNode(activeI18n.t(actor.id) + " → " + destName + " (en camino: " + elapsed + "/" + plan.walkTime + " min)")
          ];
          widgets.inventory.replaceChildren(...children);
          return;
        }

        const children = [];

        const header = document.createElement("div");
        header.textContent = t(actor.id) + " (" + t("actors." + actor.locationId + ".name") + ")";
        children.push(header);

        const items = game.getInventory(actor.id) || [];
        const othersAtLoc = mission.actors.filter((a) =>
          a.id !== actor.id &&
          a.location &&
          a.location.id === actor.location.id &&
          !(game.getPlans()[a.id] && game.getPlans()[a.id].startTime !== null)
        );

        if (giveMode) {
          const giveDiv = document.createElement("div");
          giveDiv.textContent = "Give " + giveMode.itemName + " to:";
          children.push(giveDiv);
          const recipientList = document.createElement("ul");
          for (const other of othersAtLoc) {
            const li = document.createElement("li");
            li.textContent = activeI18n.t(other.id);
            li.style.cursor = "pointer";
            li.addEventListener("click", () => {
              game.giveItem(actor.id, other.id, giveMode.item);
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
          itemsLabel.textContent = activeI18n.t("items") + ": ";
          itemsDiv.appendChild(itemsLabel);
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemConfig = game.getConfig().items[item.id];
            const itemName = itemConfig ? resolveName(itemConfig.name) : item.id;
            if (i > 0) itemsDiv.appendChild(document.createTextNode(", "));
            if (othersAtLoc.length > 0) {
              const span = document.createElement("span");
              span.textContent = itemName;
              span.style.cursor = "pointer";
              span.style.textDecoration = "underline";
              span.addEventListener("click", () => {
                giveMode = { item, itemName };
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
              li.textContent = resolveName(loc.name) + " — actual";
              li.style.color = "gray";
            } else if (dist === Infinity) {
              li.textContent = resolveName(loc.name) + " — sin ruta";
              li.style.color = "gray";
            } else {
              const walkTime = Math.round(game.computeWalkTime(dist));
              li.textContent = resolveName(loc.name) + " — " + walkTime + " min (" + dist + " km)";
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
          const plan = game.getPlans()[actor.id];
          if (plan && plan.startTime === null) {
            const destLoc = mission.locations.find((l) => l.id === plan.destination);
            const destName = destLoc ? resolveName(destLoc.name) : plan.destination;
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
        const lang = activeI18n.language();
        const mission = game.getMission();
        if (widgets.mission && mission) {
          const header = document.createElement("div");
          header.textContent =
            activeI18n.t("mission") + ": " + resolveName(mission.name) +
            " | " + activeI18n.t("startsAt") + ": " + formatTime(mission.start, lang) +
            " | " + activeI18n.t("deadline") + ": " + formatTime(mission.deadline, lang);
          const children = [header];
          if (mission.briefing) {
            const p = document.createElement("p");
            p.textContent = activeI18n.t("briefing") + ": " + resolveName(mission.briefing);
            children.push(p);
          }
          widgets.mission.replaceChildren(...children);
        }
        if (widgets.actors && mission) {
          const title = document.createElement("h3");
          title.textContent = activeI18n.t("actors") + ":";
          const list = document.createElement("ul");
          for (const actor of mission.actors) {
            const item = document.createElement("li");
            const plan = game.getPlans()[actor.id];
            const loc = actor.location ? " (" + resolveName(actor.location.name) + ")" : "";
            let planText = "";
            if (plan) {
              const destLoc = mission.locations.find((l) => l.id === plan.destination);
              const destName = destLoc ? resolveName(destLoc.name) : plan.destination;
              if (plan.startTime !== null) {
                const elapsed = game.state.internalTime - plan.startTime;
                planText = " → " + destName + " (en camino: " + elapsed + "/" + plan.walkTime + " min)";
              } else {
                planText = " → " + destName + " (" + plan.walkTime + " min)";
              }
            }
            item.textContent = actor.key + ". " + activeI18n.t(actor.id) + loc + planText;
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
          title.textContent = activeI18n.t("locations") + ":";
          const children = [title];
          for (const loc of mission.locations) {
            const subtitle = document.createElement("h4");
            subtitle.textContent = resolveName(loc.name);
            children.push(subtitle);
            const actorsAtLoc = mission.actors
              .filter((a) => {
                if (!a.location) return false;
                const plan = game.getPlans()[a.id];
                if (plan && plan.startTime !== null) return false;
                return a.location.id === loc.id;
              })
              .sort((a, b) => a.key - b.key);
            if (actorsAtLoc.length > 0) {
              const list = document.createElement("ul");
              for (const actor of actorsAtLoc) {
                const item = document.createElement("li");
                item.textContent = activeI18n.t(actor.id);
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
            const plan = game.getPlans()[a.id];
            return plan && plan.startTime !== null;
          });
          if (inTransit.length > 0) {
            const transitDiv = document.createElement("div");
            transitDiv.textContent = "En tránsito:";
            children.push(transitDiv);
            const list = document.createElement("ul");
            for (const actor of inTransit) {
              const plan = game.getPlans()[actor.id];
              const destLoc = mission.locations.find((l) => l.id === plan.destination);
              const destName = destLoc ? resolveName(destLoc.name) : plan.destination;
              const elapsed = game.state.internalTime - plan.startTime;
              const item = document.createElement("li");
              item.textContent = activeI18n.t(actor.id) + " → " + destName + " (" + elapsed + "/" + plan.walkTime + " min)";
              list.appendChild(item);
            }
            children.push(list);
          }

          widgets.locations.replaceChildren(...children);
        }
        if (widgets.clock && game.getClock()) {
          const clockDiv = document.createElement("div");
          clockDiv.textContent = activeI18n.t("clock") + ": " + formatTime(game.getClock(), lang);

          const hasPlans = Object.keys(game.getPlans()).length > 0;
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
        if (widgets.analog_clock && game.getClock()) {
          const clock = game.getClock();
          const h = clock.getHours();
          const m = clock.getMinutes();
          const hourAngle = ((h % 12) + m / 60) * 30;
          const minuteAngle = m * 6;

          const svgNS = "http://www.w3.org/2000/svg";
          const svg = document.createElementNS(svgNS, "svg");
          svg.setAttribute("viewBox", "0 0 100 100");
          svg.setAttribute("width", "150");
          svg.setAttribute("height", "150");

          const face = document.createElementNS(svgNS, "circle");
          face.setAttribute("cx", "50");
          face.setAttribute("cy", "50");
          face.setAttribute("r", "45");
          face.setAttribute("fill", "none");
          face.setAttribute("stroke", "black");
          face.setAttribute("stroke-width", "1");
          svg.appendChild(face);

          for (let i = 0; i < 12; i++) {
            const angle = i * 30;
            const major = i % 3 === 0;
            const r1 = major ? 38 : 40;
            const r2 = 45;
            const rad = (angle - 90) * Math.PI / 180;
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", 50 + r1 * Math.cos(rad));
            line.setAttribute("y1", 50 + r1 * Math.sin(rad));
            line.setAttribute("x2", 50 + r2 * Math.cos(rad));
            line.setAttribute("y2", 50 + r2 * Math.sin(rad));
            line.setAttribute("stroke", "black");
            line.setAttribute("stroke-width", major ? "2" : "1");
            svg.appendChild(line);
          }

          const hourHand = document.createElementNS(svgNS, "line");
          hourHand.setAttribute("x1", "50");
          hourHand.setAttribute("y1", "50");
          hourHand.setAttribute("x2", "50");
          hourHand.setAttribute("y2", "25");
          hourHand.setAttribute("stroke", "black");
          hourHand.setAttribute("stroke-width", "3");
          hourHand.setAttribute("stroke-linecap", "round");
          hourHand.setAttribute("transform", "rotate(" + hourAngle + ", 50, 50)");
          svg.appendChild(hourHand);

          const minuteHand = document.createElementNS(svgNS, "line");
          minuteHand.setAttribute("x1", "50");
          minuteHand.setAttribute("y1", "50");
          minuteHand.setAttribute("x2", "50");
          minuteHand.setAttribute("y2", "15");
          minuteHand.setAttribute("stroke", "black");
          minuteHand.setAttribute("stroke-width", "1.5");
          minuteHand.setAttribute("stroke-linecap", "round");
          minuteHand.setAttribute("transform", "rotate(" + minuteAngle + ", 50, 50)");
          svg.appendChild(minuteHand);

          const dot = document.createElementNS(svgNS, "circle");
          dot.setAttribute("cx", "50");
          dot.setAttribute("cy", "50");
          dot.setAttribute("r", "2");
          dot.setAttribute("fill", "black");
          svg.appendChild(dot);

          const digitalDiv = document.createElement("div");
          digitalDiv.textContent = formatTime(clock, lang);

          widgets.analog_clock.textContent = "";
          widgets.analog_clock.appendChild(svg);
          widgets.analog_clock.appendChild(digitalDiv);
        }
        renderInventory();
      };

      if (widgets.inventory) {
        widgets.inventory.style.display = "none";
      }

      if (widgets.languages) {
        const langs = game.getConfig().languages;
        if (langs.length <= 1) {
          widgets.languages.style.display = "none";
        } else {
          for (const code of langs) {
            const btn = document.createElement("button");
            btn.textContent = Presentation.languageName(code);
            btn.addEventListener("click", () => activeI18n.setLanguage(code));
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
    }
  // };
// };

// window.Renderer = { create };

let activeI18n = null;
let activeEngine = null;

function boot() {
  loadGame(window.game.config);
  // set language ?
}

function loadGame(config) {
  activeI18n = Presentation.createI18n({
    languages: config.languages,
    dictionaries: [Umbra.baseTranslations, config.translations],
  });
  activeI18n.setLanguage("en");
  activeEngine = Umbra.create(config);

  connect(activeEngine);

  activeEngine.start();

  // activeEngine.on("mission:start", onMissionStart);
  // activeEngine.on("clock:set", onClockSet);
  // activeEngine.on("plan:set", onPlansChanged);
  // activeEngine.on("plan:cancel", onPlansChanged);
  // activeEngine.on("plan:done", onPlansChanged);
}

// function onMissionStart() { // ({ mission }) {
//   renderAll();
// }

function t(key) { return activeI18n.t(key); }

function resolveName(nameToResolve) {
  return nameToResolve;
}

boot();

})();
