(() => {
"use strict";

const overlay = document.getElementById("overlay");
const btnPlay = document.getElementById("btn-play");
const btnCredits = document.getElementById("btn-credits");
const btnAbout = document.getElementById("btn-about");
const btnShowMenu = document.getElementById("btn-show-menu");
const langSelector = document.getElementById("lang-selector");
const langSelectorInline = document.getElementById("lang-selector-inline");
const missionNumber = document.getElementById("mission-number");
const missionTitle = document.getElementById("mission-title");
const missionBriefing = document.getElementById("mission-briefing");
const locationsList = document.getElementById("locations-list");
const actorPanel = document.getElementById("actor-panel");
const actorPanelName = document.getElementById("actor-panel-name");
const actorPanelItems = document.getElementById("actor-panel-items");
const actorPanelClose = document.getElementById("actor-panel-close");
const actorPanelActions = document.getElementById("actor-panel-actions");
const clockEl = document.getElementById("clock");

let activeI18n = null;
let activeEngine = null;
let activeClock = null;
let selectedActorId = null;
let walkToMode = false;
let started = false;

function markActiveLanguage(code) {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === code);
  });
}

function setLanguage(code) {
  const active = activeI18n.setLanguage(code);
  if (!active) return;
  markActiveLanguage(active);
  Presentation.applyI18n(document, activeI18n);
  updateClockText();
}

function setPlayLabel(key) {
  const label = btnPlay.querySelector("[data-i18n]");
  if (label) Presentation.setI18nKey(label, key, activeI18n);
}

function showOverlay() {
  overlay.classList.add("active");
}

function hideOverlay() {
  overlay.classList.remove("active");
}

function renderMission(mission) {
  missionNumber.textContent = mission.index + 1;
  Presentation.setI18nKey(missionTitle, Presentation.key("missions", mission.id, "name"), activeI18n);
}

function renderClock(time) {
  activeClock = time;
  updateClockText();
}

function renderLocations() {
  const mission = activeEngine.getMission();
  const actor = walkToMode && selectedActorId ? activeEngine.getActor(selectedActorId) : null;
  locationsList.replaceChildren();

  for (const loc of mission.locations) {
    const card = document.createElement("div");
    card.className = "location-card";

    const info = document.createElement("div");
    info.className = "loc-info";

    const name = document.createElement("div");
    name.className = "loc-name";
    Presentation.setI18nKey(name, Presentation.key("locations", loc.id, "name"), activeI18n);
    info.appendChild(name);

    const here = document.createElement("div");
    here.className = "actors-here";
    const present = mission.actors
      .filter((a) => a.locationId === loc.id)
      .sort((a, b) => a.key - b.key);
    present.forEach((a, i) => {
      if (i > 0) here.appendChild(document.createTextNode(", "));
      const span = document.createElement("span");
      if (!actor) {
        span.className = "actor-link";
        span.dataset.actorId = a.id;
      }
      Presentation.setI18nKey(span, Presentation.key("actors", a.id, "name"), activeI18n);
      here.appendChild(span);
    });
    info.appendChild(here);
    card.appendChild(info);

    if (actor) {
      const distance = activeEngine.distance(actor.locationId, loc.id);
      if (loc.id === actor.locationId || distance === Infinity) {
        card.classList.add("disabled");
      } else {
        card.classList.add("selectable");
        card.dataset.locationId = loc.id;
        const walkTime = activeEngine.computeWalkTime(distance);
        const dist = document.createElement("div");
        dist.className = "loc-distance";
        dist.textContent = Presentation.formatDistance(distance) + " · " + Presentation.formatWalkTime(walkTime);
        card.appendChild(dist);
      }
    }

    locationsList.appendChild(card);
  }
}

function makeActionButton(key, onClick) {
  const button = document.createElement("button");
  button.className = "btn";
  Presentation.setI18nKey(button, key, activeI18n);
  button.addEventListener("click", onClick);
  return button;
}

function renderActorPanel() {
  if (!selectedActorId || !activeEngine) {
    actorPanel.hidden = true;
    return;
  }
  const actor = activeEngine.getActor(selectedActorId);
  if (!actor) {
    actorPanel.hidden = true;
    return;
  }

  actorPanel.hidden = false;
  Presentation.setI18nKey(actorPanelName, Presentation.key("actors", selectedActorId, "name"), activeI18n);
  renderItems(actor);
  renderActions(actor);
}

function renderItems(actor) {
  actorPanelItems.replaceChildren();
  const items = activeEngine.getInventory(actor.id);
  items.forEach((itemId, i) => {
    if (i > 0) actorPanelItems.appendChild(document.createTextNode(", "));
    const tag = document.createElement("span");
    tag.className = "item-tag";
    Presentation.setI18nKey(tag, Presentation.key("items", itemId, "name"), activeI18n);
    actorPanelItems.appendChild(tag);
  });
}

function renderActions(actor) {
  actorPanelActions.replaceChildren();

  if (walkToMode) {
    actorPanelActions.appendChild(makeActionButton("plan.cancel", exitWalkTo));
    return;
  }

  const plan = activeEngine.getPlan(actor.id);
  if (plan && plan.startTime === null) {
    const line = document.createElement("div");
    line.className = "plan-line";
    line.appendChild(document.createTextNode("→ "));
    const dest = document.createElement("span");
    Presentation.setI18nKey(dest, Presentation.key("locations", plan.destination, "name"), activeI18n);
    line.appendChild(dest);
    line.appendChild(document.createTextNode(" (" + Presentation.formatWalkTime(plan.walkTime) + ")"));
    actorPanelActions.appendChild(line);
    actorPanelActions.appendChild(makeActionButton("plan.cancel", () => cancelPlan(actor.id)));
    return;
  }

  actorPanelActions.appendChild(makeActionButton("plan.walkTo", enterWalkTo));
}

function selectActor(actorId) {
  selectedActorId = actorId;
  walkToMode = false;
  renderActorPanel();
  renderLocations();
}

function enterWalkTo() {
  walkToMode = true;
  renderActorPanel();
  renderLocations();
}

function exitWalkTo() {
  walkToMode = false;
  renderActorPanel();
  renderLocations();
}

function chooseDestination(locationId) {
  walkToMode = false;
  activeEngine.setPlan(selectedActorId, locationId);
  renderActorPanel();
  renderLocations();
}

function cancelPlan(actorId) {
  activeEngine.cancelPlan(actorId);
  renderActorPanel();
}

function closeActorPanel() {
  selectedActorId = null;
  walkToMode = false;
  actorPanel.hidden = true;
  renderLocations();
}

function updateClockText() {
  if (activeClock) clockEl.textContent = Presentation.formatDateTime(activeClock, activeI18n.language());
}

function onMissionStart({ mission }) {
  renderMission(mission);
  Presentation.renderRichText(missionBriefing, mission.briefing, activeI18n, {
    prefix: "briefing",
    base: Presentation.key("missions", mission.id, "briefing"),
  });
  renderLocations();
  hideOverlay();
}

function onClockSet({ time }) {
  renderClock(time);
}

function renderLanguageSelector(container, config, caption) {
  container.replaceChildren();
  for (const lang of config.languages || []) {
    const btn = document.createElement("button");
    btn.className = "lang-btn";
    btn.dataset.lang = lang.code;
    btn.textContent = caption === "code" ? lang.code : lang.name;
    container.appendChild(btn);
  }
}

function loadGame(config) {
  config = config || {};
  activeI18n = Presentation.createI18n({ config, base: Umbra.baseTranslations });
  renderLanguageSelector(langSelector, config, "name");
  renderLanguageSelector(langSelectorInline, config, "code");

  const playable = Array.isArray(config.missions) && config.missions.length > 0;
  activeEngine = playable ? Umbra.create(config) : null;
  if (activeEngine) {
    activeEngine.on("mission:start", onMissionStart);
    activeEngine.on("clock:set", onClockSet);
  }
}

function startGame() {
  if (activeEngine) activeEngine.start();
  else hideOverlay();
}

function handleLanguageClick(e) {
  const btn = e.target.closest(".lang-btn");
  if (btn) setLanguage(btn.dataset.lang);
}

langSelector.addEventListener("click", handleLanguageClick);
langSelectorInline.addEventListener("click", handleLanguageClick);

locationsList.addEventListener("click", (e) => {
  const actorEl = e.target.closest("[data-actor-id]");
  if (actorEl) {
    selectActor(actorEl.dataset.actorId);
    return;
  }
  const locEl = e.target.closest("[data-location-id]");
  if (locEl && walkToMode) chooseDestination(locEl.dataset.locationId);
});

actorPanelClose.addEventListener("click", closeActorPanel);

btnPlay.addEventListener("click", () => {
  if (!started) {
    started = true;
    setPlayLabel("menu.continue");
    startGame();
  } else {
    hideOverlay();
  }
});

btnCredits.addEventListener("click", () => {
  alert("Credits — not implemented yet");
});

btnAbout.addEventListener("click", () => {
  alert("About — not implemented yet");
});

btnShowMenu.addEventListener("click", showOverlay);

function boot() {
  const games = window.games || {};
  const params = new URLSearchParams(window.location.search);
  const name = params.get("game");
  if (!Object.hasOwn(games, name)) {
    console.error("umbra: unknown game: " + name);
    return;
  }

  btnPlay.disabled = false;
  btnCredits.disabled = false;
  btnAbout.disabled = false;

  loadGame(games[name].config);
  const requested = params.get("lang");
  const languages = activeI18n.languages();
  setLanguage(languages.includes(requested) ? requested : languages[0]);
}

boot();

})();
