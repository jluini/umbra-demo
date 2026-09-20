(() => {
"use strict";

const overlay = document.getElementById("overlay");
const btnPlay = document.getElementById("btn-play");
const btnCredits = document.getElementById("btn-credits");
const btnAbout = document.getElementById("btn-about");
const btnShowMenu = document.getElementById("btn-show-menu");
const btnToggleBriefing = document.getElementById("btn-toggle-briefing");
const btnPlayGame = document.getElementById("btn-play-game");
const langSelector = document.getElementById("lang-selector");
const langSelectorInline = document.getElementById("lang-selector-inline");
const missionNumber = document.getElementById("mission-number");
const missionTitle = document.getElementById("mission-title");
const missionBriefing = document.getElementById("mission-briefing");
const missionBar = document.getElementById("mission-bar");
const btnMissionBarClose = document.getElementById("mission-bar-close");
const avatarsRow = document.getElementById("avatars");
const locationsList = document.getElementById("locations-list");
const transit = document.getElementById("transit");
const transitList = document.getElementById("transit-list");
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
let playing = false;
let playTimer = null;
let started = false;
let dragState = null;

const DRAG_THRESHOLD = 8;

const REAL_MS_PER_GAME_MIN = 250;

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

function renderAvatars() {
  const mission = activeEngine.getMission();
  const actors = mission.actors.slice().sort((a, b) => a.key - b.key);
  avatarsRow.hidden = actors.length === 0;
  avatarsRow.replaceChildren();

  for (const actor of actors) {
    const box = document.createElement("div");
    box.className = "avatar-box";
    box.dataset.actorId = actor.id;
    if (actor.id === selectedActorId) box.classList.add("active");
    if (actor.avatar) {
      box.innerHTML = actor.avatar;
    } else {
      box.textContent = actor.id.charAt(0).toUpperCase();
      box.style.color = actor.color || "#e0e0e0";
    }
    avatarsRow.appendChild(box);
  }
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
      .filter((a) => {
        if (a.locationId !== loc.id) return false;
        const plan = activeEngine.getPlan(a.id);
        return !plan || plan.startTime === null;
      })
      .sort((a, b) => a.key - b.key);
    present.forEach((a, i) => {
      if (i > 0) here.appendChild(document.createTextNode(", "));
      const span = document.createElement("span");
      if (!actor && !playing) {
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
  for (const item of items) {
    const box = document.createElement("div");
    box.className = "item-box";
    box.dataset.itemId = item.id;
    box.textContent = item.avatarString || item.id.charAt(0).toUpperCase();
    box.addEventListener("pointerdown", (e) => startItemDrag(e, box, item));
    box.addEventListener("pointermove", onItemPointerMove);
    box.addEventListener("pointerup", onItemPointerUp);
    box.addEventListener("pointercancel", onItemPointerCancel);
    actorPanelItems.appendChild(box);
  }
}

function renderActions(actor) {
  actorPanelActions.replaceChildren();

  if (walkToMode) {
    actorPanelActions.appendChild(makeActionButton("plan.cancel", exitWalkTo));
    return;
  }

  const plan = activeEngine.getPlan(actor.id);
  if (plan && plan.startTime !== null) {
    actorPanelActions.appendChild(makePlanLine(plan, true));
    return;
  }
  if (plan) {
    actorPanelActions.appendChild(makePlanLine(plan, false));
    actorPanelActions.appendChild(makeActionButton("plan.cancel", () => cancelPlan(actor.id)));
    return;
  }

  actorPanelActions.appendChild(makeActionButton("plan.walkTo", enterWalkTo));
}

function makePlanLine(plan, started) {
  const line = document.createElement("div");
  line.className = "plan-line";
  line.appendChild(document.createTextNode("→ "));
  const dest = document.createElement("span");
  Presentation.setI18nKey(dest, Presentation.key("locations", plan.destination, "name"), activeI18n);
  line.appendChild(dest);
  const progress = started
    ? " (" + (activeEngine.getInternalTime() - plan.startTime) + "/" + plan.walkTime + " min)"
    : " (" + Presentation.formatWalkTime(plan.walkTime) + ")";
  line.appendChild(document.createTextNode(progress));
  return line;
}

function selectActor(actorId) {
  selectedActorId = actorId;
  walkToMode = false;
  renderActorPanel();
  renderLocations();
  renderAvatars();
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
  renderAvatars();
}

function clearDropTargets() {
  avatarsRow.querySelectorAll(".avatar-box.drop-target").forEach((box) => {
    box.classList.remove("drop-target");
  });
}

function startItemDrag(e, box, item) {
  if (!selectedActorId) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  e.preventDefault();
  box.setPointerCapture(e.pointerId);
  dragState = {
    item,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    active: false,
    target: null,
    box,
  };
}

function findDropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  const box = el && el.closest(".avatar-box");
  if (!box || box.dataset.actorId === selectedActorId) return null;
  return box;
}

function onItemPointerMove(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  if (!dragState.active) {
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragState.active = true;
    dragState.box.classList.add("dragging");
  }
  e.preventDefault();
  clearDropTargets();
  const target = findDropTarget(e.clientX, e.clientY);
  dragState.target = target;
  if (target) target.classList.add("drop-target");
}

function onItemPointerUp(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const { box, item, active, target } = dragState;
  cleanupItemDrag(box, e.pointerId);
  if (!active || !target) return;
  if (activeEngine.giveItem(selectedActorId, target.dataset.actorId, item)) {
    renderActorPanel();
  }
}

function onItemPointerCancel(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  cleanupItemDrag(dragState.box, e.pointerId);
}

function cleanupItemDrag(box, pointerId) {
  dragState = null;
  if (box) {
    box.classList.remove("dragging");
    if (box.hasPointerCapture(pointerId)) box.releasePointerCapture(pointerId);
  }
  clearDropTargets();
}

function renderTransit() {
  const now = activeEngine.getInternalTime();
  const entries = Object.entries(activeEngine.getPlans())
    .filter(([, plan]) => plan.startTime !== null);
  transit.hidden = entries.length === 0;
  transitList.replaceChildren();

  for (const [actorId, plan] of entries) {
    const line = document.createElement("div");
    line.className = "transit-line";
    const actor = document.createElement("span");
    Presentation.setI18nKey(actor, Presentation.key("actors", actorId, "name"), activeI18n);
    line.appendChild(actor);
    line.appendChild(document.createTextNode(" → "));
    const dest = document.createElement("span");
    Presentation.setI18nKey(dest, Presentation.key("locations", plan.destination, "name"), activeI18n);
    line.appendChild(dest);
    line.appendChild(document.createTextNode(" (" + (now - plan.startTime) + "/" + plan.walkTime + " min)"));
    transitList.appendChild(line);
  }
}

function hasPlans() {
  return Object.keys(activeEngine.getPlans()).length > 0;
}

function updatePlayButton() {
  btnPlayGame.disabled = playing || !activeEngine || !hasPlans();
}

function onPlansChanged() {
  updatePlayButton();
  renderLocations();
  renderTransit();
  if (selectedActorId) renderActorPanel();
}

function startPlay() {
  if (playing || !activeEngine || !hasPlans()) return;
  playing = true;
  closeActorPanel();
  activeEngine.play();
  renderLocations();
  renderTransit();
  updatePlayButton();
  playTimer = setInterval(tick, REAL_MS_PER_GAME_MIN);
}

function tick() {
  activeEngine.advanceTime(1);
  const completed = activeEngine.checkPlans();
  if (completed.length === 0) return;
  for (const { actorId } of completed) activeEngine.completePlan(actorId);
  stopPlay();
}

function stopPlay() {
  playing = false;
  clearInterval(playTimer);
  playTimer = null;
  renderLocations();
  renderTransit();
  updatePlayButton();
}

function updateClockText() {
  if (activeClock) clockEl.textContent = Presentation.formatDateTime(activeClock, activeI18n.language());
}

function onMissionStart({ mission }) {
  renderMission(mission);
  renderAvatars();
  Presentation.renderRichText(missionBriefing, mission.briefing, activeI18n, {
    prefix: "briefing",
    base: Presentation.key("missions", mission.id, "briefing"),
  });
  renderLocations();
  renderTransit();
  updatePlayButton();
  hideOverlay();
}

function onClockSet({ time }) {
  renderClock(time);
  renderTransit();
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
    activeEngine.on("plan:set", onPlansChanged);
    activeEngine.on("plan:cancel", onPlansChanged);
    activeEngine.on("plan:done", onPlansChanged);
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

avatarsRow.addEventListener("click", (e) => {
  const box = e.target.closest("[data-actor-id]");
  if (box && !playing) {
    setBriefingVisible(false);
    selectActor(box.dataset.actorId);
  }
});

function setBriefingVisible(visible) {
  missionBar.hidden = !visible;
  btnToggleBriefing.classList.toggle("active", visible);
  btnToggleBriefing.setAttribute("aria-expanded", String(visible));
}

btnToggleBriefing.addEventListener("click", () => setBriefingVisible(missionBar.hidden));
btnMissionBarClose.addEventListener("click", () => setBriefingVisible(false));

btnPlayGame.addEventListener("click", startPlay);

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
  const defaults = window.umbraDefaults || {};
  const games = window.games || {};
  const params = new URLSearchParams(window.location.search);
  const name = params.get("game") || defaults.game;
  if (!Object.hasOwn(games, name)) {
    console.error("umbra: unknown game: " + name);
    return;
  }

  btnPlay.disabled = false;
  btnCredits.disabled = false;
  btnAbout.disabled = false;

  loadGame(games[name].config);
  const requested = params.get("lang") || defaults.lang;
  const languages = activeI18n.languages();
  setLanguage(languages.includes(requested) ? requested : languages[0]);
  btnPlay.focus();
}

boot();

})();
