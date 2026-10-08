// Modern UI controller.
// Dependencies:
//   common/utils.js          (Utils.buildKey)
//   umbra/umbra.js           (Umbra)
//   presentation/i18n.js     (Presentation.createI18n)
//   presentation/i18n-dom.js (Presentation.setI18nText, Presentation.applyI18n)
//   presentation/format.js   (Presentation.formatDateTime/formats/Distance/Duration)
//   presentation/richtext.js (Presentation.renderRichText)
(() => {
"use strict";

const uiTranslations = {
  en: {
    ui: {
      map: "Map",
      victory: "Mission accomplished",
      defeat: "Mission failed",
      restart: "Restart",
      backToMenu: "Back to menu",
      confirmAbortTitle: "Abort mission?",
      confirmAbortMessage: "You will lose your progress and return to the menu.",
      confirmRestartTitle: "Restart mission?",
      confirmRestartMessage: "Your current progress will be lost and the mission will start over."
    }
  },
  es: {
    ui: {
      map: "Mapa",
      victory: "Misión cumplida",
      defeat: "Misión fallida",
      restart: "Reiniciar",
      backToMenu: "Volver al menú",
      confirmAbortTitle: "¿Abortar la misión?",
      confirmAbortMessage: "Vas a perder el progreso y volver al menú.",
      confirmRestartTitle: "¿Reiniciar la misión?",
      confirmRestartMessage: "Vas a perder el progreso actual y la misión comenzará de nuevo."
    }
  },
  pt: {
    ui: {
      map: "Mapa",
      victory: "Missão cumprida",
      defeat: "Missão falhada",
      restart: "Reiniciar",
      backToMenu: "Voltar ao menu",
      confirmAbortTitle: "Abortar a missão?",
      confirmAbortMessage: "Você vai perder o progresso e voltar ao menu.",
      confirmRestartTitle: "Reiniciar a missão?",
      confirmRestartMessage: "Você vai perder o progresso atual e a missão começará de novo."
    }
  },
};

const overlay = document.getElementById("overlay");
const btnPlay = document.getElementById("btn-play");
const btnCredits = document.getElementById("btn-credits");
const btnAbout = document.getElementById("btn-about");
const btnShowMenu = document.getElementById("btn-show-menu");
const missionToggle = document.getElementById("mission-toggle");
const btnRun = document.getElementById("btn-run");
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
const actorPanelLoc = document.getElementById("actor-panel-loc");
const actorPanelItems = document.getElementById("actor-panel-items");
const actorPanelClose = document.getElementById("actor-panel-close");
const actorPanelActions = document.getElementById("actor-panel-actions");
const actorPanelHead = document.getElementById("actor-panel-head");
const actorPanelBody = document.getElementById("actor-panel-body");
const mapViewport = document.getElementById("map-viewport");
const mapContent = document.getElementById("map-content");
const clockEl = document.getElementById("clock");
const resultTitle = document.getElementById("result-title");
const resultMessage = document.getElementById("result-message");
const btnRestart = document.getElementById("btn-restart");
const btnBackMenu = document.getElementById("btn-back-menu");
const btnAbort = document.getElementById("btn-abort");
const btnRestartMission = document.getElementById("btn-restart-mission");
const confirmEl = document.getElementById("confirm");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmAccept = document.getElementById("confirm-accept");
const confirmCancel = document.getElementById("confirm-cancel");

const mapView = Components.createMapView(mapViewport, mapContent, {
  onLocationClick: handleMapLocationClick,
});

let activeI18n = null;
let activeEngine = null;
let activeClock = null;
let selectedActorId = null;
let walkToMode = false;
let advancing = false;
let advanceTimer = null;
let started = false;
let currentMissionIndex = 0;
let dragState = null;
let expandedStackId = null;
let badgeItem = null;
let badgeLingerTimer = null;
let badgeRemoveTimer = null;
let confirmAction = null;

const DRAG_THRESHOLD = 8;

const REAL_MS_PER_GAME_MIN = 250;

const BADGE_LINGER_MS = 1200;
const BADGE_FADE_MS = 600;

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

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.toggle("active", el.id === id);
  });
  overlay.classList.add("active");
}

function showOverlay() {
  showScreen("screen-titles");
}

function hideOverlay() {
  overlay.classList.remove("active");
}

function syncMenuButtons() {
  btnAbort.hidden = !started;
  btnRestartMission.hidden = !started;
}

function openConfirm({ titleKey, messageKey, acceptKey, onAccept }) {
  confirmAction = onAccept;
  Presentation.setI18nText(confirmTitle, titleKey, activeI18n);
  Presentation.setI18nText(confirmMessage, messageKey, activeI18n);
  Presentation.setI18nText(confirmAccept, acceptKey, activeI18n);
  confirmEl.hidden = false;
  confirmAccept.focus();
}

function closeConfirm() {
  confirmEl.hidden = true;
  confirmAction = null;
}

function acceptConfirm() {
  const action = confirmAction;
  closeConfirm();
  if (action) action();
}

function renderMission(mission) {
  missionNumber.textContent = mission.index + 1;
  Presentation.setI18nText(missionTitle, Utils.buildKey("missions", mission.id, "name"), activeI18n);
}

function buildAvatars() {
  clearStackBadges();
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
      if (!actor && !advancing) {
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
        const walkTime = activeEngine.computeTravelTime(distance, "walk");
        const dist = document.createElement("div");
        dist.className = "loc-distance";
        dist.textContent = Presentation.formatDistance(distance) + " · " + Presentation.formatDuration(walkTime);
        card.appendChild(dist);
      }
    }

    locationsList.appendChild(card);
  }
}

function makeActionButton(key, onClick, extraClass) {
  const button = document.createElement("button");
  button.className = "btn" + (extraClass ? " " + extraClass : "");
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
  renderActorLocation(actor);
  renderItems(actor);
  renderActions(actor);
  applyPanelHeight();
}

function renderActorLocation(actor) {
  actorPanelLoc.replaceChildren();
  actorPanelLoc.appendChild(document.createTextNode("· "));
  if (actor.activity.kind === "transit") {
    actorPanelLoc.appendChild(makeLocationName(actor.activity.from));
    actorPanelLoc.appendChild(document.createTextNode(" → "));
    actorPanelLoc.appendChild(makeLocationName(actor.activity.to));
  } else {
    actorPanelLoc.appendChild(makeLocationName(actor.activity.at));
  }
}

function fillItemIcon(el, item) {
  if (item.avatar) {
    el.innerHTML = item.avatar;
  } else if (item.avatarString) {
    el.textContent = item.avatarString;
  } else {
    el.textContent = item.id.charAt(0).toUpperCase();
  }
}

// Decimal denominations below total, descending, at most maxBoxes of them
// (1 is always offered so any amount can be composed with repeated drags).
function partitionValues(total, maxBoxes = 6) {
  const denoms = [];
  for (let base = 1; base < total; base *= 10) {
    for (const mult of [1, 2, 5]) {
      const value = base * mult;
      if (value < total && !denoms.includes(value)) denoms.push(value);
    }
  }
  denoms.sort((a, b) => b - a);
  if (denoms.length > maxBoxes) {
    const trimmed = denoms.slice(0, maxBoxes - 1);
    if (!trimmed.includes(1)) trimmed.push(1);
    return trimmed.sort((a, b) => b - a);
  }
  return denoms;
}

function renderItems(actor) {
  actorPanelItems.replaceChildren();
  if (actor.activity.kind !== "idle") return;
  const groups = activeEngine.getItemGroups(actor.id);

  if (expandedStackId) {
    const stack = groups.find((g) => g.item.id === expandedStackId);
    if (!stack || !stack.item.stackable || stack.count < 2) expandedStackId = null;
  }

  const ordered = groups.filter((g) => g.item.stackable).concat(groups.filter((g) => !g.item.stackable));
  for (const { item, count } of ordered) {
    // Non-stackable items render one tile each; stackables collapse into one.
    const tiles = item.stackable ? 1 : count;
    for (let n = 0; n < tiles; n++) {
      const tile = document.createElement("div");
      tile.className = "item-tile";

      const box = document.createElement("div");
      const itemName = Utils.buildKey("items", item.id, "name");
      const isStack = item.stackable;
      const canExpand = isStack && count > 1;
      const expanded = canExpand && expandedStackId === item.id;
      const dragQuantity = isStack ? count : 1;

      box.className = "item-box" + (expanded ? " stack" : "");
      box.dataset.itemId = item.id;
      Presentation.setI18nAttr(box, "title", itemName, activeI18n);
      Presentation.setI18nAttr(box, "aria-label", itemName, activeI18n);
      fillItemIcon(box, item);
      if (isStack) {
        const badge = document.createElement("span");
        badge.className = "item-count";
        badge.textContent = count;
        box.appendChild(badge);
      }
      box.addEventListener("pointerdown", (e) => startItemDrag(e, box, item, dragQuantity, canExpand));
      box.addEventListener("pointermove", onItemPointerMove);
      box.addEventListener("pointerup", onItemPointerUp);
      box.addEventListener("pointercancel", onItemPointerCancel);
      tile.appendChild(box);

      if (expanded) {
        tile.appendChild(makeItemPalette(item, count));
      }
      actorPanelItems.appendChild(tile);
    }
  }

  const palette = actorPanelItems.querySelector(".item-palette");
  if (palette && palette.getBoundingClientRect().right > window.innerWidth - 4) {
    palette.classList.add("left");
  }
}

function makeItemPalette(item, total) {
  const palette = document.createElement("div");
  palette.className = "item-palette";

  for (const value of partitionValues(total)) {
    const box = document.createElement("div");
    box.className = "item-box partition";
    box.dataset.itemId = item.id;
    fillItemIcon(box, item);
    const badge = document.createElement("span");
    badge.className = "item-count";
    badge.textContent = value;
    box.appendChild(badge);
    box.addEventListener("pointerdown", (e) => startItemDrag(e, box, item, value, false));
    box.addEventListener("pointermove", onItemPointerMove);
    box.addEventListener("pointerup", onItemPointerUp);
    box.addEventListener("pointercancel", onItemPointerCancel);
    palette.appendChild(box);
  }

  const close = document.createElement("button");
  close.type = "button";
  close.className = "item-palette-close";
  close.textContent = "✕";
  Presentation.setI18nAttr(close, "aria-label", "plan.cancel", activeI18n);
  close.addEventListener("click", (e) => {
    e.stopPropagation();
    closePalette();
  });
  palette.appendChild(close);

  return palette;
}

function closePalette() {
  if (!expandedStackId) return;
  expandedStackId = null;
  clearStackBadges();
  if (selectedActorId) renderActorPanel();
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

  actorPanelActions.appendChild(makeActionButton("plan.walkTo", enterWalkTo, "primary"));
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
  expandedStackId = null;
  panelSnap = "auto";
  clearStackBadges();
  renderActorPanel();
  renderLocations();
  renderMap();
  updateActiveAvatar();
}

function enterWalkTo() {
  walkToMode = true;
  renderActorPanel();
  renderLocations();
  renderMap();
}

function exitWalkTo() {
  walkToMode = false;
  renderActorPanel();
  renderLocations();
  renderMap();
}

function chooseDestination(locationId) {
  walkToMode = false;
  activeEngine.setPlan(selectedActorId, locationId, "walk");
  renderActorPanel();
  renderLocations();
  renderMap();
}

function cancelPlan(actorId) {
  activeEngine.cancelPlan(actorId);
  renderActorPanel();
}

function closeActorPanel() {
  selectedActorId = null;
  walkToMode = false;
  expandedStackId = null;
  clearStackBadges();
  actorPanel.hidden = true;
  renderLocations();
  updateActiveAvatar();
}

/* ---- Actor panel as a sheet (peek / auto, tap & drag) ---- */

const PANEL_PEEK = 54;
let panelSnap = "auto";
let panelAutoH = 300;
let panelDrag = null;

function applyPanelHeight() {
  if (actorPanel.hidden) return;
  let h;
  if (panelSnap === "peek") {
    h = PANEL_PEEK;
  } else {
    panelAutoH = actorPanelHead.offsetHeight + actorPanelBody.scrollHeight;
    h = Math.max(PANEL_PEEK, Math.min(panelAutoH, window.innerHeight * 0.82));
  }
  actorPanel.style.setProperty("--actor-panel-h", h + "px");
  actorPanelHead.classList.toggle("collapsed", h <= PANEL_PEEK + 1);
  actorPanelBody.style.visibility = h <= PANEL_PEEK + 1 ? "hidden" : "";
}

actorPanelHead.addEventListener("pointerdown", (e) => {
  panelDrag = { id: e.pointerId, y: e.clientY, start: actorPanel.getBoundingClientRect().height, moved: false };
  if (actorPanelHead.setPointerCapture) actorPanelHead.setPointerCapture(e.pointerId);
  actorPanel.style.transition = "none";
  e.preventDefault();
});
actorPanelHead.addEventListener("pointermove", (e) => {
  if (!panelDrag || e.pointerId !== panelDrag.id) return;
  const dy = e.clientY - panelDrag.y;
  if (Math.abs(dy) > 6) panelDrag.moved = true;
  const h = Math.max(PANEL_PEEK, Math.min(window.innerHeight * 0.9, panelDrag.start - dy));
  actorPanel.style.setProperty("--actor-panel-h", h + "px");
});
function endPanelDrag(e) {
  if (!panelDrag || (e && e.pointerId !== panelDrag.id)) return;
  const moved = panelDrag.moved;
  panelDrag = null;
  actorPanel.style.transition = "";
  if (!moved) {
    panelSnap = panelSnap === "peek" ? "auto" : "peek";
  } else {
    const h = actorPanel.getBoundingClientRect().height;
    const auto = Math.min(panelAutoH, window.innerHeight * 0.82);
    panelSnap = Math.abs(h - PANEL_PEEK) < Math.abs(h - auto) ? "peek" : "auto";
  }
  applyPanelHeight();
}
actorPanelHead.addEventListener("pointerup", endPanelDrag);
actorPanelHead.addEventListener("pointercancel", endPanelDrag);

window.addEventListener("resize", applyPanelHeight);

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

function updateStackBadges(item) {
  clearTimeout(badgeLingerTimer);
  clearTimeout(badgeRemoveTimer);
  badgeItem = item;
  avatarsRow.querySelectorAll(".avatar-count").forEach((badge) => badge.remove());
  avatarsRow.querySelectorAll(".avatar-box").forEach((box) => {
    const actorId = box.dataset.actorId;
    const available = actorId === selectedActorId || isValidDropTarget(actorId);
    const badge = document.createElement("span");
    badge.className = "avatar-count" + (available ? "" : " dim");
    badge.textContent = activeEngine.getItemCount(actorId, item.id);
    box.appendChild(badge);
  });
}

function fadeStackBadges(delay) {
  if (!badgeItem) return;
  clearTimeout(badgeLingerTimer);
  badgeLingerTimer = setTimeout(() => {
    avatarsRow.querySelectorAll(".avatar-count").forEach((badge) => badge.classList.add("fade"));
    badgeRemoveTimer = setTimeout(() => {
      avatarsRow.querySelectorAll(".avatar-count").forEach((badge) => badge.remove());
      badgeItem = null;
    }, BADGE_FADE_MS);
  }, delay);
}

function settleStackBadges(item) {
  updateStackBadges(item);
  if (expandedStackId !== item.id) fadeStackBadges(BADGE_LINGER_MS);
}

function clearStackBadges() {
  clearTimeout(badgeLingerTimer);
  clearTimeout(badgeRemoveTimer);
  avatarsRow.querySelectorAll(".avatar-count").forEach((badge) => badge.remove());
  badgeItem = null;
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

function startItemDrag(e, box, item, quantity, toggle) {
  if (!selectedActorId) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (!Number.isInteger(quantity) || quantity < 1) return;
  e.preventDefault();
  box.setPointerCapture(e.pointerId);
  dragState = {
    item,
    quantity,
    toggle,
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
    if (dragState.item.stackable) updateStackBadges(dragState.item);
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
  const { box, item, quantity, toggle, active, target } = dragState;
  cleanupItemDrag(box, e.pointerId);
  if (!active) {
    if (toggle) {
      const opening = expandedStackId !== item.id;
      expandedStackId = opening ? item.id : null;
      if (opening) updateStackBadges(item);
      else clearStackBadges();
      renderActorPanel();
    } else if (expandedStackId) {
      closePalette();
    }
    return;
  }
  if (target && activeEngine.giveItem(selectedActorId, target.dataset.actorId, item, quantity)) {
    renderActorPanel();
  }
  if (item.stackable) settleStackBadges(item);
}

function onItemPointerCancel(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const { box, item } = dragState;
  cleanupItemDrag(box, e.pointerId);
  if (item.stackable) settleStackBadges(item);
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

function buildMapScene() {
  const mission = activeEngine.getMission();
  const config = activeEngine.getConfig();
  const actors = activeEngine.getActors();
  const inMission = new Set(mission.locations.map((l) => l.id));

  const actor = selectedActorId ? activeEngine.getActor(selectedActorId) : null;
  const selecting = walkToMode && actor && actor.activity.kind === "idle";

  return {
    locations: mission.locations.map((loc) => {
      const entry = { id: loc.id, map: loc.map, pictureUrl: loc.pictureUrl };
      if (selecting) {
        if (loc.id === actor.activity.at) {
          entry.state = "current";
        } else {
          const d = activeEngine.distance(actor.activity.at, loc.id);
          if (d !== Infinity) {
            entry.state = "reachable";
            entry.badge = Presentation.formatDistance(d);
          } else {
            entry.state = "dim";
          }
        }
      }
      return entry;
    }),
    routes: (config.routes || []).filter((r) => inMission.has(r.from) && inMission.has(r.to)),
    tokens: actors
      .filter((a) => a.activity.kind === "idle")
      .map((a) => ({
        id: a.id,
        at: a.activity.at,
        color: a.preset.color,
        avatarUrl: a.preset.avatarUrl,
        initial: a.id.charAt(0).toUpperCase(),
      })),
  };
}

function renderMap() {
  if (activeEngine) mapView.render(buildMapScene(), activeI18n);
}

// Tap a reachable location on the map to choose it as the destination.
function handleMapLocationClick(locationId) {
  if (walkToMode) chooseDestination(locationId);
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

function canAdvance() {
  return activeEngine ? activeEngine.canAdvance() : false;
}

function updateRunButton() {
  btnRun.disabled = advancing || !activeEngine || !canAdvance();
}

function onPlansChanged() {
  updateRunButton();
  renderLocations();
  renderMap();
  renderTransit();
  if (selectedActorId) renderActorPanel();
}

function startAdvancing() {
  if (advancing || !activeEngine || !canAdvance()) return;
  advancing = true;
  closeActorPanel();
  renderLocations();
  renderTransit();
  updateRunButton();
  advanceTimer = setInterval(tick, REAL_MS_PER_GAME_MIN);
}

function tick() {
  if (overlay.classList.contains("active")) return;
  const { completed, ended } = activeEngine.advance();
  if (completed.length > 0 || ended) stopAdvancing();
}

function stopAdvancing() {
  advancing = false;
  clearInterval(advanceTimer);
  advanceTimer = null;
  renderLocations();
  renderTransit();
  updateRunButton();
}

function onMissionEnd(ending) {
  Presentation.setI18nText(resultTitle, "ui." + ending.effect, activeI18n);
  if (ending.message) {
    Presentation.setI18nText(resultMessage, ending.message, activeI18n);
  } else {
    resultMessage.removeAttribute("data-i18n");
    resultMessage.textContent = "";
  }
  showScreen("screen-result");
}

function resetGameUI() {
  selectedActorId = null;
  walkToMode = false;
  expandedStackId = null;
  clearStackBadges();
  dragState = null;
  advancing = false;
  clearInterval(advanceTimer);
  advanceTimer = null;
  actorPanel.hidden = true;
  updateActiveAvatar();
  // If needed, the game widgets could be cleared here, e.g.:
  // avatarsRow.replaceChildren(); locationsList.replaceChildren(); mapContent.replaceChildren();
}

function restartMission() {
  if (!activeEngine) return;
  activeEngine.stop();
  activeEngine.start(currentMissionIndex);
}

function backToMenu() {
  if (activeEngine) activeEngine.stop();
  started = false;
  setPlayLabel("menu.play");
  syncMenuButtons();
  showScreen("screen-titles");
}

function updateClockText() {
  if (activeClock) clockEl.textContent = Presentation.formatDateTime(activeClock, activeI18n.language(), "time");
}

function onMissionStart({ mission }) {
  currentMissionIndex = mission.index;
  renderMission(mission);
  buildAvatars();
  renderMap();
  Presentation.renderRichText(missionBriefing, mission.briefing, activeI18n, {
    prefix: "briefing",
    base: Utils.buildKey("missions", mission.id, "briefing"),
  });
  setBriefingVisible(true);
  renderLocations();
  renderTransit();
  updateRunButton();
  hideOverlay();
}

function onClockSet({ time }) {
  renderClock(time);
  renderMap();
  renderTransit();
}

function languageName(code) {
  return Utils.capitalizeFirst(Presentation.languageName(code));
}

function renderLanguageSelector(container, gameConfig, caption) {
  container.replaceChildren();
  for (const code of gameConfig.languages || []) {
    const btn = document.createElement("button");
    btn.className = "lang-btn";
    btn.dataset.lang = code;
    btn.textContent = caption === "code" ? code : languageName(code);
    container.appendChild(btn);
  }
}

function loadGame(gameConfig) {
  gameConfig = gameConfig || {};
  activeI18n = Presentation.createI18n({
    languages: gameConfig.languages,
    dictionaries: [
      Umbra.baseTranslations,
      uiTranslations,
      gameConfig.translations
    ],
  });
  renderLanguageSelector(langSelector, gameConfig, "name");
  renderLanguageSelector(langSelectorInline, gameConfig, "code");

  const hasMissions = !!gameConfig.missions && Object.keys(gameConfig.missions).length > 0;
  activeEngine = hasMissions ? Umbra.create(gameConfig) : null;
  if (activeEngine) {
    activeEngine.on("mission:start", onMissionStart);
    activeEngine.on("clock:set", onClockSet);
    activeEngine.on("plan:set", onPlansChanged);
    activeEngine.on("plan:cancel", onPlansChanged);
    activeEngine.on("mission:end", onMissionEnd);
    activeEngine.on("mission:reset", resetGameUI);
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
    syncMenuButtons();
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
  if (box && !advancing) {
    setBriefingVisible(false);
    selectActor(box.dataset.actorId);
  }
});

// A press outside the open partition palette dismisses it. Presses on item boxes
// are left to the item logic (which toggles or drags) to avoid re-rendering mid-press.
document.addEventListener("pointerdown", (e) => {
  if (!expandedStackId) return;
  const target = e.target;
  if (target.closest(".item-palette") || target.closest(".item-box")) return;
  closePalette();
}, true);

function setBriefingVisible(visible) {
  missionBar.hidden = !visible;
  missionToggle.classList.toggle("active", visible);
  missionToggle.setAttribute("aria-expanded", String(visible));
}

missionToggle.addEventListener("click", () => setBriefingVisible(missionBar.hidden));
btnMissionBarClose.addEventListener("click", () => setBriefingVisible(false));

btnRun.addEventListener("click", startAdvancing);

btnRestart.addEventListener("click", restartMission);

btnBackMenu.addEventListener("click", backToMenu);

btnPlay.addEventListener("click", () => enterGame());

btnAbort.addEventListener("click", () => {
  openConfirm({
    titleKey: "ui.confirmAbortTitle",
    messageKey: "ui.confirmAbortMessage",
    acceptKey: "menu.abort",
    onAccept: backToMenu,
  });
});

btnRestartMission.addEventListener("click", () => {
  openConfirm({
    titleKey: "ui.confirmRestartTitle",
    messageKey: "ui.confirmRestartMessage",
    acceptKey: "menu.restart",
    onAccept: restartMission,
  });
});

confirmAccept.addEventListener("click", acceptConfirm);

confirmCancel.addEventListener("click", closeConfirm);

confirmEl.addEventListener("pointerdown", (e) => {
  if (e.target === confirmEl) closeConfirm();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !confirmEl.hidden) closeConfirm();
});

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
  syncMenuButtons();

  loadGame(games[name].config);
  const requested = params.get("lang") || defaults.lang;
  const languages = activeI18n.languages();
  setLanguage(languages.includes(requested) ? requested : languages[0]);
  btnPlay.focus();

  const missionParam = params.get("play");
  if (missionParam !== null && /^\d+$/.test(missionParam)) {
    enterGame(Number(missionParam) - 1);
  }
}

boot();

})();
