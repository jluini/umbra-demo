// Modern UI controller.
// Dependencies:
//   common/utils.js          (Utils.buildKey)
//   umbra/umbra.js           (Umbra)
//   presentation/i18n.js     (Presentation.createI18n)
//   presentation/i18n-dom.js (Presentation.setI18nText, Presentation.applyI18n)
//   presentation/format.js   (Presentation.formatDateTime/Distance/Duration)
//   presentation/richtext.js (Presentation.renderRichText)
(() => {
"use strict";

const uiTranslations = {
  en: {
    ui: {
      map: "Map"
    }
  },
  es: {
    ui: {
      map: "Mapa"
    }
  },
};

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
  if (label) Presentation.setI18nText(label, key, activeI18n);
}

function showOverlay() {
  overlay.classList.add("active");
}

function hideOverlay() {
  overlay.classList.remove("active");
}

function renderMission(mission) {
  missionNumber.textContent = mission.index + 1;
  Presentation.setI18nText(missionTitle, Utils.buildKey("missions", mission.id, "name"), activeI18n);
}

function buildAvatars() {
  const mission = activeEngine.getMission();
  const actors = mission.actors.slice().sort((a, b) => a.preset.key - b.preset.key);
  avatarsRow.hidden = actors.length === 0;
  avatarsRow.replaceChildren();

  for (const actor of actors) {
    const preset = actor.preset;
    const box = document.createElement("div");
    const actorName = Utils.buildKey("actors", actor.id, "name");

    box.className = "avatar-box";
    box.dataset.actorId = actor.id;
    Presentation.setI18nAttr(box, "title", actorName, activeI18n);
    Presentation.setI18nAttr(box, "aria-label", actorName, activeI18n);

    if (preset.avatarUrl) {
      const img = document.createElement("img");
      img.className = "actor-img";
      img.src = preset.avatarUrl;
      img.alt = "";
      box.appendChild(img);
    } else if (preset.avatar) {
      box.innerHTML = preset.avatar;
    } else {
      box.textContent = actor.id.charAt(0).toUpperCase();
      box.style.color = preset.color || "#e0e0e0";
    }
    avatarsRow.appendChild(box);
  }
}

function updateActiveAvatar() {
  avatarsRow.querySelectorAll(".avatar-box").forEach((box) => {
    box.classList.toggle("active", box.dataset.actorId === selectedActorId);
  });
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
    Presentation.setI18nText(name, Utils.buildKey("locations", loc.id, "name"), activeI18n);
    info.appendChild(name);

    const here = document.createElement("div");
    here.className = "actors-here";
    const present = mission.actors
      .filter((a) => a.activity.kind === "idle" && a.activity.at === loc.id)
      .sort((a, b) => a.preset.key - b.preset.key);
    present.forEach((a, i) => {
      if (i > 0) here.appendChild(document.createTextNode(", "));
      const span = document.createElement("span");
      if (!actor && !playing) {
        span.className = "actor-link";
        span.dataset.actorId = a.id;
      }
      Presentation.setI18nText(span, Utils.buildKey("actors", a.id, "name"), activeI18n);
      here.appendChild(span);
    });
    info.appendChild(here);
    card.appendChild(info);

    if (actor) {
      const distance = activeEngine.distance(actor.activity.at, loc.id);
      if (loc.id === actor.activity.at || distance === Infinity) {
        card.classList.add("disabled");
      } else {
        card.classList.add("selectable");
        card.dataset.locationId = loc.id;
        const walkTime = activeEngine.computeWalkTime(distance);
        const dist = document.createElement("div");
        dist.className = "loc-distance";
        dist.textContent = Presentation.formatDistance(distance) + " · " + Presentation.formatDuration(walkTime);
        card.appendChild(dist);
      }
    }

    locationsList.appendChild(card);
  }
}

function makeActionButton(key, onClick) {
  const button = document.createElement("button");
  button.className = "btn";
  Presentation.setI18nText(button, key, activeI18n);
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
  Presentation.setI18nText(actorPanelName, Utils.buildKey("actors", selectedActorId, "name"), activeI18n);
  renderItems(actor);
  renderActions(actor);
}

function renderItems(actor) {
  actorPanelItems.replaceChildren();
  if (actor.activity.kind !== "idle") return;
  const items = activeEngine.getInventory(actor.id);
  for (const item of items) {
    const box = document.createElement("div");
    const itemName = Utils.buildKey("items", item.id, "name");

    box.className = "item-box";
    box.dataset.itemId = item.id;
    Presentation.setI18nAttr(box, "title", itemName, activeI18n);
    Presentation.setI18nAttr(box, "aria-label", itemName, activeI18n);

    // if (item.avatarSize) box.style.setProperty("--item-avatar-size", item.avatarSize);
    if (item.avatar) {
      box.innerHTML = item.avatar;
    } else if (item.avatarString) {
      box.textContent = item.avatarString;
    } else {
      box.textContent = item.id.charAt(0).toUpperCase();
    }
    box.addEventListener("pointerdown", (e) => startItemDrag(e, box, item));
    box.addEventListener("pointermove", onItemPointerMove);
    box.addEventListener("pointerup", onItemPointerUp);
    box.addEventListener("pointercancel", onItemPointerCancel);
    actorPanelItems.appendChild(box);
  }
}

function renderActions(actor) {
  actorPanelActions.replaceChildren();
  const plan = activeEngine.getPlan(actor.id);
  actorPanelActions.appendChild(makeActivityRow(actor, plan));

  if (walkToMode) {
    actorPanelActions.appendChild(makeActionButton("plan.cancel", exitWalkTo));
    return;
  }

  if (actor.activity.kind === "transit") return;

  if (plan) return;

  actorPanelActions.appendChild(makeActionButton("plan.walkTo", enterWalkTo));
}

function makeLocationName(locationId) {
  const span = document.createElement("span");
  Presentation.setI18nText(span, Utils.buildKey("locations", locationId, "name"), activeI18n);
  return span;
}

function makeActivityRow(actor, plan) {
  const row = document.createElement("div");
  row.className = "activity-row";
  row.appendChild(makeActivityLine(actor, plan));
  if (plan) {
    const cancel = document.createElement("button");
    cancel.className = "activity-cancel";
    cancel.textContent = "✕";
    cancel.addEventListener("click", () => cancelPlan(actor.id));
    row.appendChild(cancel);
  }
  return row;
}

function makeActivityLine(actor, plan) {
  const line = document.createElement("div");
  line.className = "activity-line";

  if (actor.activity.kind === "transit") {
    line.appendChild(makeLocationName(actor.activity.from));
    line.appendChild(document.createTextNode(" → "));
    line.appendChild(makeLocationName(actor.activity.to));
    line.appendChild(document.createTextNode(
      " (" + (activeEngine.getInternalTime() - actor.activity.startedAt) + "/" + actor.activity.duration + " min)"
    ));
    return line;
  }

  line.appendChild(makeLocationName(actor.activity.at));
  if (plan) {
    line.appendChild(document.createTextNode(" → "));
    line.appendChild(makeLocationName(plan.destination));
    line.appendChild(document.createTextNode(" (" + Presentation.formatDuration(plan.duration) + ")"));
  }
  return line;
}

function selectActor(actorId) {
  selectedActorId = actorId;
  walkToMode = false;
  renderActorPanel();
  renderLocations();
  updateActiveAvatar();
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
  updateActiveAvatar();
}

function clearDropTargets() {
  avatarsRow.querySelectorAll(".avatar-box.drop-target").forEach((box) => {
    box.classList.remove("drop-target");
  });
}

function clearValidTargets() {
  avatarsRow.querySelectorAll(".avatar-box.valid-target").forEach((box) => {
    box.classList.remove("valid-target");
  });
}

function isValidDropTarget(actorId) {
  if (!selectedActorId || actorId === selectedActorId) return false;
  const giver = activeEngine.getActor(selectedActorId);
  const target = activeEngine.getActor(actorId);
  if (!giver || !target) return false;
  if (giver.activity.kind !== "idle" || target.activity.kind !== "idle") return false;
  return giver.activity.at === target.activity.at;
}

function markValidTargets() {
  avatarsRow.querySelectorAll(".avatar-box").forEach((box) => {
    box.classList.toggle("valid-target", isValidDropTarget(box.dataset.actorId));
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
    pointerType: e.pointerType,
    startX: e.clientX,
    startY: e.clientY,
    active: false,
    target: null,
    ghost: null,
    box,
  };
}

function createDragGhost(box) {
  const ghost = document.createElement("div");
  ghost.className = "item-drag-ghost";
  for (const child of box.childNodes) ghost.appendChild(child.cloneNode(true));
  return ghost;
}

function updateGhostPosition(ghost, pointerType, x, y) {
  ghost.style.left = x + "px";
  ghost.style.top = (pointerType === "touch" ? y - 48 : y) + "px";
}

function findDropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  const box = el && el.closest(".avatar-box");
  if (!box || !isValidDropTarget(box.dataset.actorId)) return null;
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
    dragState.ghost = createDragGhost(dragState.box);
    document.body.appendChild(dragState.ghost);
    markValidTargets();
  }
  e.preventDefault();
  updateGhostPosition(dragState.ghost, dragState.pointerType, e.clientX, e.clientY);
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
  if (dragState && dragState.ghost) dragState.ghost.remove();
  dragState = null;
  if (box) {
    box.classList.remove("dragging");
    if (box.hasPointerCapture(pointerId)) box.releasePointerCapture(pointerId);
  }
  clearDropTargets();
  clearValidTargets();
}

function renderTransit() {
  const now = activeEngine.getInternalTime();
  const inTransit = activeEngine.getActors().filter((a) => a.activity.kind === "transit");
  transit.hidden = inTransit.length === 0;
  transitList.replaceChildren();

  for (const actor of inTransit) {
    const activity = actor.activity;
    const line = document.createElement("div");
    line.className = "transit-line";
    const actorEl = document.createElement("span");
    Presentation.setI18nText(actorEl, Utils.buildKey("actors", actor.id, "name"), activeI18n);
    line.appendChild(actorEl);
    line.appendChild(document.createTextNode(" → "));
    const dest = document.createElement("span");
    Presentation.setI18nText(dest, Utils.buildKey("locations", activity.to, "name"), activeI18n);
    line.appendChild(dest);
    line.appendChild(document.createTextNode(" (" + (now - activity.startedAt) + "/" + activity.duration + " min)"));
    transitList.appendChild(line);
  }
}

function hasWork() {
  if (Object.keys(activeEngine.getPlans()).length > 0) return true;
  return activeEngine.getActors().some((a) => a.activity.kind === "transit");
}

function updatePlayButton() {
  btnPlayGame.disabled = playing || !activeEngine || !hasWork();
}

function onPlansChanged() {
  updatePlayButton();
  renderLocations();
  renderTransit();
  if (selectedActorId) renderActorPanel();
}

function startPlay() {
  if (playing || !activeEngine || !hasWork()) return;
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
  buildAvatars();
  Presentation.renderRichText(missionBriefing, mission.briefing, activeI18n, {
    prefix: "briefing",
    base: Utils.buildKey("missions", mission.id, "briefing"),
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

function renderLanguageSelector(container, gameConfig, caption) {
  container.replaceChildren();
  for (const lang of gameConfig.languages || []) {
    const btn = document.createElement("button");
    btn.className = "lang-btn";
    btn.dataset.lang = lang.code;
    btn.textContent = caption === "code" ? lang.code : lang.name;
    container.appendChild(btn);
  }
}

function loadGame(gameConfig) {
  gameConfig = gameConfig || {};
  activeI18n = Presentation.createI18n({
    languages: gameConfig.languages.map((lang) => lang.code),
    dictionaries: [
      Umbra.baseTranslations,
      uiTranslations,
      gameConfig.translations
    ],
  });
  renderLanguageSelector(langSelector, gameConfig, "name");
  renderLanguageSelector(langSelectorInline, gameConfig, "code");

  const playable = Array.isArray(gameConfig.missions) && gameConfig.missions.length > 0;
  activeEngine = playable ? Umbra.create(gameConfig) : null;
  if (activeEngine) {
    activeEngine.on("mission:start", onMissionStart);
    activeEngine.on("clock:set", onClockSet);
    activeEngine.on("plan:set", onPlansChanged);
    activeEngine.on("plan:cancel", onPlansChanged);
    activeEngine.on("plan:done", onPlansChanged);
  }
}

function startGame(missionIndex) {
  if (activeEngine) activeEngine.start(missionIndex);
  else hideOverlay();
}

function enterGame(missionIndex) {
  if (!started) {
    started = true;
    setPlayLabel("menu.continue");
    startGame(missionIndex);
  } else {
    hideOverlay();
  }
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

btnPlay.addEventListener("click", () => enterGame());

btnCredits.addEventListener("click", () => enterGame(1));

btnAbout.addEventListener("click", () => enterGame(2));

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

  const play = params.get("play");
  if (play !== null && /^\d+$/.test(play)) {
    enterGame(Number(play) - 1);
  }
}

boot();

})();
