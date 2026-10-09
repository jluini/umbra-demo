// Mobile UI controller (host).
// Dependencies:
//   common/utils.js          (Utils.buildKey)
//   umbra/umbra.js           (Umbra)
//   presentation/i18n.js     (Presentation.createI18n)
//   presentation/i18n-dom.js (Presentation.setI18nText, Presentation.applyI18n)
//   presentation/format.js   (Presentation.formatDateTime)
//   presentation/richtext.js (Presentation.renderRichText)
//   translations.js          (window.MobileTranslations)
(() => {
"use strict";

const uiTranslations = window.MobileTranslations || {};
const titlesEl = document.getElementById("titles");
const briefingEl = document.getElementById("briefing");
const briefingCloseBtn = document.getElementById("briefing-close");
const menuEl = document.getElementById("menu");
const resultEl = document.getElementById("result");
const confirmEl = document.getElementById("confirm");

const playBtn = document.getElementById("playBtn");
const playLabel = playBtn.querySelector("[data-i18n]");
const titlesMissions = document.getElementById("titlesMissions");
const langSelector = document.getElementById("lang-selector");
const menuBtn = document.getElementById("menuBtn");
const missionBtn = document.getElementById("missionBtn");
const missionNumber = document.getElementById("mission-number");
const missionTitle = document.getElementById("mission-title");
const clockEl = document.getElementById("clockBtn");
const runBtn = document.getElementById("runBtn");
const datePop = document.getElementById("datePop");
const dayToast = document.getElementById("dayToast");

const avatarsEl = document.getElementById("avatars");
const inventoryBar = document.getElementById("inventoryBar");
const sheetEl = document.getElementById("sheet");
const sheetHead = document.getElementById("sheetHead");
const sheetBody = document.getElementById("sheetBody");
const mapEl = document.getElementById("map");

const briefingEyebrow = document.getElementById("briefing-eyebrow");
const briefingTitle = document.getElementById("briefing-title");
const missionBriefing = document.getElementById("mission-briefing");

const resultTitle = document.getElementById("result-title");
const resultMessage = document.getElementById("result-message");
const btnRestart = document.getElementById("btn-restart");
const btnBackMenu = document.getElementById("btn-back-menu");

const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmAccept = document.getElementById("confirm-accept");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmScrim = document.getElementById("confirm-scrim");

let activeI18n = null;
let activeEngine = null;
let activeClock = null;
let started = false;
let currentMissionIndex = 0;
let advancing = false;
let advanceTimer = null;
let confirmAction = null;
let selectedActorId = null;
let sheetMode = "idle"; // idle | destination | means | trade
let selectedDestId = null;
let listView = false;
let inventoryOpen = false;
let selectedItemId = null;
let giveMode = false;
let selectedLooseItem = null; // { locationId, itemId, key }
let takeMode = false;
let lastInvActor = null;

const REAL_MS_PER_GAME_MIN = 250;

const mobileMap = MobileMap.create(mapEl, {
  onLocationClick: handleLocationClick,
  onTokenClick: (id) => selectActor(id),
  onItemClick: (locId, itemId, key, reservedBy) => selectLooseItem(locId, itemId, key, reservedBy),
  bottomInset: () => (sheetEl.hidden ? 0 : sheetEl.getBoundingClientRect().height),
  renderAvatar,
});

/* ============================ i18n / language ============================ */

function languageName(code) {
  return Utils.capitalizeFirst(Presentation.languageName(code));
}

function markActiveLanguage(code) {
  langSelector.querySelectorAll(".lang").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.lang === code);
  });
}

function setLanguage(code) {
  const active = activeI18n.setLanguage(code);
  if (!active) return;
  markActiveLanguage(active);
  Presentation.applyI18n(document, activeI18n);
  updateClockText();
  if (selectedActorId || selectedLooseItem) refresh();
}

function renderLanguageSelector(container, gameConfig) {
  container.replaceChildren();
  for (const code of gameConfig.languages || []) {
    const btn = document.createElement("button");
    btn.className = "lang";
    btn.dataset.lang = code;
    btn.textContent = code.toUpperCase();
    btn.title = languageName(code);
    container.appendChild(btn);
  }
}

function handleLanguageClick(e) {
  const btn = e.target.closest(".lang");
  if (btn) setLanguage(btn.dataset.lang);
}

langSelector.addEventListener("click", handleLanguageClick);

/* ============================ Overlays ============================ */

function showTitles() { titlesEl.hidden = false; }
function hideTitles() { titlesEl.hidden = true; }

function showBriefing(initial) {
  Presentation.setI18nText(briefingCloseBtn, initial ? "ui.briefing.start" : "ui.briefing.close", activeI18n);
  briefingEl.hidden = false;
}
function hideBriefing() { briefingEl.hidden = true; }

function openMenu() { menuEl.hidden = false; }
function closeMenu() { menuEl.hidden = true; }

function showResult() { resultEl.hidden = false; }
function hideResult() { resultEl.hidden = true; }

function setConfirmText(el, key, literal) {
  if (key != null) { Presentation.setI18nText(el, key, activeI18n); return; }
  el.removeAttribute("data-i18n");
  el.textContent = literal == null ? "" : literal;
}

function openConfirm({ titleKey, messageKey, acceptKey, title, message, accept, onAccept }) {
  confirmAction = onAccept;
  setConfirmText(confirmTitle, titleKey, title);
  setConfirmText(confirmMessage, messageKey, message);
  setConfirmText(confirmAccept, acceptKey, accept);
  confirmEl.hidden = false;
}

function closeConfirm() {
  confirmEl.hidden = true;
  confirmAction = null;
}

/* ============================ Clock / date ============================ */

function updateClockText() {
  if (activeClock) clockEl.textContent = Presentation.formatDateTime(activeClock, activeI18n.language(), "time");
}

function showDatePop() {
  datePop.innerHTML = "<small>" + Utils.capitalizeFirst(Presentation.languageName(activeI18n.language())) + "</small>" +
    Presentation.formatDateTime(activeClock, activeI18n.language(), "date");
  datePop.hidden = false;
  clockEl.classList.add("active");
}
function hideDatePop() { datePop.hidden = true; clockEl.classList.remove("active"); }
function toggleDatePop() { if (datePop.hidden) showDatePop(); else hideDatePop(); }

/* ============================ Engine / missions ============================ */

function updateRunButton() {
  runBtn.disabled = advancing || !activeEngine || !activeEngine.canAdvance();
  runBtn.classList.toggle("running", advancing);
}

function loadGame(gameConfig) {
  gameConfig = gameConfig || {};
  activeI18n = Presentation.createI18n({
    languages: gameConfig.languages,
    dictionaries: [Umbra.baseTranslations, uiTranslations, gameConfig.translations],
  });
  renderLanguageSelector(langSelector, gameConfig);

  const hasMissions = !!gameConfig.missions && Object.keys(gameConfig.missions).length > 0;
  activeEngine = hasMissions ? Umbra.create(gameConfig) : null;
  if (activeEngine) {
    activeEngine.on("mission:start", onMissionStart);
    activeEngine.on("clock:set", onClockSet);
    activeEngine.on("plan:set", onPlansChanged);
    activeEngine.on("plan:cancel", onPlansChanged);
    activeEngine.on("plans:started", onPlansChanged);
    activeEngine.on("plans:completed", onPlansChanged);
    activeEngine.on("plans:cancelled", onPlansCancelled);
    activeEngine.on("item:give", onItemsChanged);
    activeEngine.on("item:drop", onItemsChanged);
    activeEngine.on("item:take", onItemsChanged);
    activeEngine.on("item:trade", onItemsChanged);
    activeEngine.on("mission:end", onMissionEnd);
    activeEngine.on("mission:reset", resetGameUI);
  }
}

function startGame(missionIndex) {
  if (!activeEngine) { hideTitles(); return; }
  if (activeEngine.getStatus() !== "ready") activeEngine.stop();
  activeEngine.start(missionIndex);
}

function enterGame(missionIndex) {
  if (activeEngine && activeEngine.getStatus() === "running") { hideTitles(); return; }
  started = true;
  startGame(missionIndex);
}

function restartMission() {
  if (!activeEngine) return;
  hideResult();
  activeEngine.stop();
  activeEngine.start(currentMissionIndex);
}

// One temporary button per available mission. They always start a mission from
// scratch; if a game is in progress, ask for confirmation first.
function renderMissionButtons() {
  if (!titlesMissions) return;
  titlesMissions.replaceChildren();
  if (!activeEngine) return;
  activeEngine.getConfig().missions.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.dataset.menu = "mission";
    btn.dataset.mission = String(i);
    btn.textContent = "M" + (i + 1);
    titlesMissions.appendChild(btn);
  });
}

// The main button is "Play" (or "Continue" while a mission is running).
function updatePlayButton() {
  const running = !!activeEngine && activeEngine.getStatus() === "running";
  Presentation.setI18nText(playLabel, running ? "menu.continue" : "menu.play", activeI18n);
}

function requestMission(index) {
  if (!activeEngine) return;
  const missions = activeEngine.getConfig().missions || [];
  if (index < 0 || index >= missions.length) return;
  if (activeEngine.getStatus() === "running") {
    openConfirm({
      titleKey: "ui.confirm.switch.title",
      messageKey: "ui.confirm.switch.message",
      acceptKey: "ui.confirm.switch.accept",
      onAccept: () => switchMission(index),
    });
  } else {
    switchMission(index);
  }
}

function switchMission(index) {
  if (!activeEngine) return;
  hideTitles();
  hideResult();
  hideBriefing();
  hideDatePop();
  closeMenu();
  started = true;
  if (activeEngine.getStatus() !== "ready") activeEngine.stop();
  activeEngine.start(index);
}

function backToMenu() {
  if (activeEngine && activeEngine.getStatus() === "ended") activeEngine.stop();
  started = true;
  hideResult();
  closeMenu();
  hideBriefing();
  hideDatePop();
  showTitles();
  updatePlayButton();
}

function onMissionStart({ mission }) {
  currentMissionIndex = mission.index;
  missionNumber.textContent = mission.index + 1;
  Presentation.setI18nText(missionTitle, Utils.buildKey("missions", mission.id, "name"), activeI18n);

  briefingEyebrow.textContent = activeI18n.t("umbra.mission") + " " + (mission.index + 1);
  Presentation.setI18nText(briefingTitle, Utils.buildKey("missions", mission.id, "name"), activeI18n);
  Presentation.renderRichText(missionBriefing, mission.briefing, activeI18n, {
    prefix: "briefing",
    base: Utils.buildKey("missions", mission.id, "briefing"),
  });

  activeClock = mission.start;
  updateClockText();
  buildAvatars();
  refresh();
  hideTitles();
  showBriefing(true);
}

function onClockSet({ time }) {
  activeClock = time;
  updateClockText();
  refresh();
}

function onMissionEnd(ending) {
  Presentation.setI18nText(resultTitle, "ui.result." + ending.effect, activeI18n);
  if (ending.message) {
    Presentation.setI18nText(resultMessage, ending.message, activeI18n);
  } else {
    resultMessage.removeAttribute("data-i18n");
    resultMessage.textContent = "";
  }
  stopAdvancing();
  showResult();
}

function resetGameUI() {
  advancing = false;
  clearInterval(advanceTimer);
  advanceTimer = null;
  selectedActorId = null;
  sheetMode = "idle";
  selectedDestId = null;
  listView = false;
  inventoryOpen = false;
  selectedItemId = null;
  giveMode = false;
  selectedLooseItem = null;
  takeMode = false;
  lastInvActor = null;
  sheetEl.hidden = true;
  sheetBody.replaceChildren();
  avatarsEl.replaceChildren();
  inventoryBar.hidden = true;
  inventoryBar.replaceChildren();
  updateRunButton();
}

/* ============================ Map / avatars / sheet ============================ */

const t = (key, params) => activeI18n.t(key, params);
const lang = () => activeI18n.language();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let toastTimer = null;
function showToast(text) {
  dayToast.textContent = text;
  dayToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { dayToast.hidden = true; }, 3000);
}

function actorName(id) {
  return activeI18n.t(Utils.buildKey("actors", id, "name"));
}
function locationName(id) {
  return activeI18n.t(Utils.buildKey("locations", id, "name"));
}
function itemName(id) {
  return activeI18n.t(Utils.buildKey("items", id, "name"));
}
function meanName(id) {
  return activeI18n.t(Utils.buildKey("means", id, "name"));
}
function meanIcon(id) {
  const m = activeEngine.getMean(id);
  return (m && m.icon) || "🚶";
}
// Item icon: raw SVG/HTML in item.avatar, a glyph in item.avatarString, else initial.
function itemIconHTML(item) {
  if (item && item.avatar) return item.avatar;
  if (item && item.avatarString) return esc(item.avatarString);
  return esc(String((item && item.id) || "?").charAt(0).toUpperCase());
}

function renderAvatar(entity, role) {
  const el = document.createElement("span");
  el.className = "av av-" + role;
  if (entity.color) el.style.setProperty("--c", entity.color);
  if (entity.avatarUrl) {
    const img = document.createElement("img");
    img.src = entity.avatarUrl;
    img.alt = "";
    img.draggable = false;
    el.appendChild(img);
  } else if (entity.avatarHtml) {
    el.innerHTML = entity.avatarHtml;
  } else {
    el.textContent = entity.initial != null ? entity.initial : "";
  }
  if (entity.title) { el.title = entity.title; el.setAttribute("aria-label", entity.title); }
  return el;
}

function buildAvatars() {
  avatarsEl.replaceChildren();
  if (!activeEngine) return;
  const mission = activeEngine.getMission();
  const actors = mission.actors.slice().sort((a, b) => a.preset.key - b.preset.key);
  for (const a of actors) {
    const name = actorName(a.id);
    const btn = document.createElement("button");
    btn.dataset.actorId = a.id;
    btn.className = "avatar-btn";
    btn.style.setProperty("--c", a.preset.color);
    btn.title = name;
    btn.appendChild(renderAvatar({ color: a.preset.color, avatarUrl: a.preset.avatarUrl, initial: name.charAt(0) }, "row"));
    const span = document.createElement("span");
    span.className = "aname";
    span.textContent = name;
    btn.appendChild(span);
    let down = null;
    btn.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" && e.button !== 0) return; down = { x: e.clientX, y: e.clientY }; });
    btn.addEventListener("pointerup", (e) => { const d = down; down = null; if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12) selectActor(a.id); });
    btn.addEventListener("pointercancel", () => { down = null; });
    btn.addEventListener("click", (e) => { if (e.detail === 0) selectActor(a.id); });
    avatarsEl.appendChild(btn);
  }
  updateAvatarStates();
}

// Selection/status only: toggles classes on the existing buttons (no rebuild).
function updateAvatarStates() {
  if (!activeEngine) return;
  const sel = selectedActorId ? activeEngine.getActor(selectedActorId) : null;
  avatarsEl.querySelectorAll(".avatar-btn").forEach((btn) => {
    const a = activeEngine.getActor(btn.dataset.actorId);
    if (!a) return;
    const far = sel && a.id !== sel.id && a.activity.at !== sel.activity.at;
    btn.classList.toggle("sel", a.id === selectedActorId);
    btn.classList.toggle("busy", a.activity.kind === "transit");
    btn.classList.toggle("far", !!far);
  });
}

function shortestPath(from, to) {
  if (from === to) return [from];
  const adj = {};
  for (const r of activeEngine.getConfig().routes || []) {
    (adj[r.from] = adj[r.from] || []).push(r.to);
    (adj[r.to] = adj[r.to] || []).push(r.from);
  }
  const prev = {};
  const seen = { [from]: true };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of adj[cur] || []) {
      if (seen[n]) continue;
      seen[n] = true;
      prev[n] = cur;
      if (n === to) {
        const path = [to];
        let p = to;
        while (prev[p] !== undefined) { p = prev[p]; path.unshift(p); }
        return path;
      }
      queue.push(n);
    }
  }
  return [];
}

function buildScene() {
  const mission = activeEngine.getMission();
  const config = activeEngine.getConfig();
  const inMission = new Set(mission.locations.map((l) => l.id));
  const actor = selectedActorId ? activeEngine.getActor(selectedActorId) : null;
  const selecting = sheetMode === "destination" && actor && actor.activity.kind === "idle";

  const locations = mission.locations.map((l) => {
    const entry = { id: l.id, map: l.map, pictureUrl: l.pictureUrl, itemSide: l.itemSide };
    if (selecting) {
      if (l.id === actor.activity.at) entry.state = "current";
      else {
        const d = activeEngine.distance(actor.activity.at, l.id);
        if (d !== Infinity) { entry.state = "reachable"; entry.badge = Presentation.formatDistance(d); }
        else entry.state = "dim";
      }
    }
    return entry;
  });

  const activeEdges = new Set();
  if (actor) {
    const plan = activeEngine.getPlan(actor.id);
    const dest = plan ? plan.destination : (actor.activity.kind === "transit" ? actor.activity.to : null);
    if (dest) {
      const path = shortestPath(actor.activity.at, dest);
      for (let i = 0; i < path.length - 1; i++) {
        activeEdges.add(path[i] + "|" + path[i + 1]);
        activeEdges.add(path[i + 1] + "|" + path[i]);
      }
    }
  }
  const routes = (config.routes || [])
    .filter((r) => inMission.has(r.from) && inMission.has(r.to))
    .map((r) => ({ from: r.from, to: r.to, active: activeEdges.has(r.from + "|" + r.to) }));

  const tokens = activeEngine.getActors()
    .filter((a) => a.activity.kind === "idle")
    .map((a) => ({
      id: a.id,
      at: a.activity.at,
      color: a.preset.color,
      avatarUrl: a.preset.avatarUrl,
      initial: actorName(a.id).charAt(0),
      title: actorName(a.id),
    }));

  const items = [];
  for (const l of mission.locations) {
    (l.items || []).forEach((item, n) => {
      const key = l.id + ":" + n;
      items.push({
        key,
        at: l.id,
        itemId: item.id,
        avatarHtml: itemIconHTML(item),
        title: itemName(item.id),
        selected: !!selectedLooseItem && selectedLooseItem.key === key,
      });
    });
    (l.reserved || []).forEach((r, n) => {
      const key = l.id + ":r" + n;
      items.push({
        key,
        at: l.id,
        itemId: r.item.id,
        avatarHtml: itemIconHTML(r.item),
        title: actorName(r.actorId),
        reserved: true,
        reservedBy: r.actorId,
        selected: !!selectedLooseItem && selectedLooseItem.key === key,
      });
    });
  }

  return { locations, routes, tokens, items };
}

function renderMap() {
  if (activeEngine) mobileMap.render(buildScene(), activeI18n);
}

/* ---------- Items / inventory ---------- */

function actorsAt(locationId) {
  return activeEngine.getActors().filter((a) => a.activity.kind === "idle" && a.activity.at === locationId);
}

function itemTileHTML(group) {
  const name = itemName(group.item.id);
  const sel = selectedItemId === group.item.id ? " sel" : "";
  return '<button class="item-tile' + sel + '" data-action="select-item" data-item="' + group.item.id + '"' +
    ' title="' + esc(name) + '" aria-label="' + esc(name) + '">' +
    '<span class="ii">' + itemIconHTML(group.item) + "</span>" +
    (group.count > 1 ? '<span class="item-count">' + group.count + "</span>" : "") +
    "</button>";
}

function itemsGridHTML(a) {
  const groups = activeEngine.getItemGroups(a.id);
  if (!groups.length) return '<div class="chips"><span class="chip empty">' + esc(t("ui.item.none")) + "</span></div>";
  return '<div class="items-grid">' + groups.map(itemTileHTML).join("") + "</div>";
}

// Inventory bar (floats below the avatars row). Shows only the item tiles; the
// selected item is detailed in the sheet. Animates when opening or switching actor.
function renderInventory() {
  const a = selectedActorId ? activeEngine.getActor(selectedActorId) : null;
  const show = !!a && inventoryOpen && !selectedLooseItem && sheetMode === "idle" && a.activity.kind === "idle";
  if (!show) {
    inventoryBar.hidden = true;
    inventoryBar.replaceChildren();
    lastInvActor = null;
    return;
  }
  const animate = inventoryBar.hidden || a.id !== lastInvActor;
  inventoryBar.hidden = false;
  inventoryBar.innerHTML = itemsGridHTML(a);
  lastInvActor = a.id;
  if (animate) {
    inventoryBar.querySelectorAll(".item-tile").forEach((el) => el.classList.add("bubble-in"));
  }
}

function itemHeaderHTML(a, itemId) {
  const item = activeEngine.getConfig().items[itemId] || { id: itemId };
  const name = item.stackable ? activeEngine.getItemCount(a.id, itemId) + " " + itemName(itemId) : itemName(itemId);
  return '<div class="sheet-title"><span class="av av-head" style="--c:var(--item-color); --c-bg:var(--panel-2)">' + itemIconHTML(item) +
    "</span><h2>" + esc(name) + '</h2><span class="at">· ' + esc(actorName(a.id)) +
    '</span><span class="at">· ' + esc(locationName(a.activity.at)) + "</span></div>";
}

function itemActionsHTML(a) {
  if (giveMode) return givePanelHTML(a);
  const item = activeEngine.getConfig().items[selectedItemId];
  const placeable = item && (item.carry === "optional" || item.carry === "none");
  let html = '<div class="item-actions">';
  if (placeable) html += '<button class="primary" data-action="drop">' + esc(t("ui.item.dropHere")) + "</button>";
  html += '<button class="primary" data-action="give">' + esc(t("ui.item.giveTo")) + "</button>";
  return html + "</div>";
}

function givePanelHTML(a) {
  const recipients = actorsAt(a.activity.at).filter((x) => x.id !== a.id);
  let html = '<div class="item-detail giving"><div class="dn"><b>' +
    esc(t("ui.item.givePrefix")) + " " + esc(itemName(selectedItemId)) + esc(t("ui.item.giveSuffix")) + "</b></div>";
  if (!recipients.length) {
    html += '<div class="recip-note">' + esc(t("ui.item.noRecipients")) + "</div>";
  } else {
    html += '<div class="recip-list">' + recipients.map((r) =>
      '<button class="recip" data-action="give-to" data-actor="' + r.id + '">' +
      '<span class="av av-map" style="--c:' + r.preset.color + '"><img src="' + r.preset.avatarUrl + '" alt=""></span>' +
      '<span class="rn">' + esc(actorName(r.id)) + "</span>" +
      '<span class="rc">' + activeEngine.getItemCount(r.id, selectedItemId) + "</span></button>").join("") + "</div>";
  }
  html += '<button class="mini-btn ghost" data-action="cancel-give">' + esc(t("plan.cancel")) + "</button></div>";
  return html;
}

// A loose (location) item: subject first, then its location as context.
function looseItemHeaderHTML(locationId, itemId) {
  const item = activeEngine.getConfig().items[itemId] || { id: itemId };
  return '<div class="sheet-title"><span class="av av-head" style="--c:var(--item-color); --c-bg:var(--panel-2)">' + itemIconHTML(item) +
    '</span><h2>' + esc(itemName(itemId)) + '</h2><span class="at">· ' +
    esc(locationName(locationId)) + "</span></div>";
}

function takeActionsHTML() {
  const item = activeEngine.getConfig().items[selectedLooseItem.itemId];
  if (!item || item.carry === "none") {
    return '<div class="phase-sub">' + esc(t("ui.item.cannotTake")) + "</div>";
  }
  if (takeMode) return takePanelHTML();
  return '<div class="item-actions"><button class="primary" data-action="take">' + esc(t("ui.item.take")) + "</button></div>";
}

function takePanelHTML() {
  const { locationId, itemId } = selectedLooseItem;
  const takers = actorsAt(locationId);
  let html = '<div class="item-detail giving"><div class="dn"><b>' +
    esc(t("ui.item.take")) + " " + esc(itemName(itemId)) + "</b></div>";
  if (!takers.length) {
    html += '<div class="recip-note">' + esc(t("ui.item.noTakers")) + "</div>";
  } else {
    html += '<div class="recip-list">' + takers.map((r) =>
      '<button class="recip" data-action="take-to" data-actor="' + r.id + '">' +
      '<span class="av av-map" style="--c:' + r.preset.color + '"><img src="' + r.preset.avatarUrl + '" alt=""></span>' +
      '<span class="rn">' + esc(actorName(r.id)) + "</span>" +
      '<span class="rc">' + activeEngine.getItemCount(r.id, itemId) + "</span></button>").join("") + "</div>";
  }
  html += '<button class="mini-btn ghost" data-action="cancel-take">' + esc(t("plan.cancel")) + "</button></div>";
  return html;
}

/* ---------- Sheet ---------- */

function actorHeaderHTML(a) {
  return '<div class="sheet-title"><span class="av av-head" style="--c:' + a.preset.color + '">' +
    '<img src="' + a.preset.avatarUrl + '" alt=""></span><h2>' + esc(actorName(a.id)) + "</h2>" +
    '<span class="at">· ' + esc(locationName(a.activity.at)) + "</span></div>";
}

function idleSheetHTML(a) {
  if (a.activity.kind === "transit") {
    const elapsed = activeEngine.getInternalTime() - a.activity.startedAt;
    const pct = Math.min(100, (elapsed / a.activity.duration) * 100);
    return '<div class="activity"><span>' + meanIcon(a.activity.mean) + '</span><div class="grow">' + esc(t("ui.plan.onTheWayTo")) +
      " <b>" + esc(locationName(a.activity.to)) + "</b><small>" + esc(meanName(a.activity.mean)) + " · " + elapsed + "/" + a.activity.duration +
      " min</small></div></div>" + '<div class="progress"><i style="width:' + pct + '%"></i></div>';
  }
  const plan = activeEngine.getPlan(a.id);
  if (plan) {
    const arrival = new Date(activeEngine.getClock().getTime() + plan.duration * 60000);
    return '<div class="activity"><span>' + meanIcon(plan.mean) + '</span><div class="grow">→ <b>' + esc(locationName(plan.destination)) +
      "</b><small>" + esc(meanName(plan.mean)) + " · " + Presentation.formatDuration(plan.duration) + " · " + esc(t("ui.plan.arrives")) + " " +
      Presentation.formatDateTime(arrival, lang(), "time") + "</small></div>" +
      '<button class="x" data-action="cancel-plan">✕</button></div>';
  }
  let html = '<button class="primary" data-action="move">' + esc(t("ui.plan.moveTo")) + "</button>";
  if (activeEngine.getTrades(a.activity.at).length > 0) {
    html += '<button class="primary" data-action="open-trades">' + esc(t("ui.trade.title")) + "</button>";
  }
  return '<div class="item-actions">' + html + "</div>";
}

function tradeRowHTML(a, trade) {
  const reward = trade.reward || [];
  const first = reward[0] ? activeEngine.getConfig().items[reward[0].item] : null;
  const title = trade.label || (first ? itemName(first.id) : "");
  const extra = reward.length > 1 ? " ×" + reward.reduce((n, e) => n + e.quantity, 0) : "";
  const cost = (trade.cost || []).map((e) => e.quantity + " × " + itemName(e.item)).join(" + ");
  const ok = activeEngine.canTrade(a.id, a.activity.at, trade.id).ok;
  const note = ok ? esc(t("ui.trade.cost")) + " " + esc(cost) : esc(t("ui.trade.missingCost"));
  return '<button class="mean-row' + (ok ? "" : " disabled") + '"' + (ok ? ' data-action="do-trade" data-trade="' + trade.id + '"' : "") + ">" +
    '<span class="mi">' + itemIconHTML(first) + "</span>" +
    '<span class="mn">' + esc(title) + extra + '<small>' + note + "</small></span></button>";
}

function tradeSheetHTML(a) {
  const trades = activeEngine.getTrades(a.activity.at);
  return '<div class="phase-bar">' +
    '<button class="icon-btn" data-action="cancel-trades">←</button>' +
    '<span class="phase-title">' + esc(t("ui.trade.title")) + " · " + esc(locationName(a.activity.at)) + "</span></div>" +
    '<div class="means-list">' + trades.map((tr) => tradeRowHTML(a, tr)).join("") + "</div>";
}

function reachableList() {
  const a = activeEngine.getActor(selectedActorId);
  return activeEngine.getMission().locations
    .filter((l) => l.id !== a.activity.at && activeEngine.distance(a.activity.at, l.id) !== Infinity)
    .map((l) => ({ loc: l, d: activeEngine.distance(a.activity.at, l.id) }))
    .sort((x, y) => x.d - y.d);
}

function destinationSheetHTML() {
  let html = '<div class="phase-bar">' +
    '<button class="icon-btn" data-action="cancel-destination">←</button>' +
    '<span class="phase-title">' + esc(t("ui.plan.chooseDestination")) + "</span>" +
    '<span class="seg">' +
    '<button class="' + (listView ? "" : "on") + '" data-action="view-map">' + esc(t("ui.plan.viewMap")) + "</button>" +
    '<button class="' + (listView ? "on" : "") + '" data-action="view-list">' + esc(t("ui.plan.viewList")) + "</button>" +
    "</span></div>";
  if (listView) {
    html += '<div class="dest-list">' + reachableList().map((r) =>
      '<button class="dest-row" data-action="choose-dest" data-loc="' + r.loc.id + '">' +
      '<span class="dn">' + esc(locationName(r.loc.id)) + '</span><span class="dd">' +
      Presentation.formatDistance(r.d) + "</span></button>").join("") + "</div>";
  } else {
    html += '<div class="phase-sub">' + esc(t("ui.plan.chooseHint")) + "</div>";
  }
  return html;
}

// One "to drop" line per violated capacity group: the item types actually present.
function formatViolation(v) {
  const names = v.items.map((x) => itemName(x.id)).join("/");
  return (v.excess > 1 ? v.excess + " " : "") + names;
}

function meansSheetHTML(a) {
  const d = activeEngine.distance(a.activity.at, selectedDestId);
  const means = activeEngine.getAvailableMeans(a.id);
  const rows = means.map((m) => {
    const duration = activeEngine.computeTravelTime(d, m.id);
    const arrival = new Date(activeEngine.getClock().getTime() + duration * 60000);
    const disabled = m.blocked ? " disabled" : "";
    const action = m.blocked ? "" : ' data-action="choose-means"';
    const note = m.blocked
      ? (m.violations || []).map((v) => "<small>" + esc(t("ui.means.dropToTravel", { items: formatViolation(v) })) + "</small>").join("")
      : "";
    return '<button class="mean-row' + disabled + '"' + action + ' data-mean="' + m.id + '">' +
      '<span class="mi">' + (m.icon || "🚶") + "</span>" +
      '<span class="mn">' + esc(meanName(m.id)) + note + "</span>" +
      '<span class="mm"><b>' + Presentation.formatDuration(duration) + "</b><small>" + esc(t("ui.plan.arrives")) + " " +
      Presentation.formatDateTime(arrival, lang(), "time") + "</small></span></button>";
  }).join("");
  return '<div class="phase-bar">' +
    '<button class="icon-btn" data-action="back-destination">←</button>' +
    '<span class="phase-title">' + esc(t("ui.plan.goTo")) + " <b>" + esc(locationName(selectedDestId)) + "</b></span></div>" +
    '<div class="phase-sub">' + Presentation.formatDistance(d) + " " + esc(t("ui.plan.tripInfo")) + "</div>" +
    '<div class="means-list">' + rows + "</div>";
}

function renderSheet() {
  if (!activeEngine) { sheetBody.replaceChildren(); return; }
  if (selectedLooseItem) {
    const head = looseItemHeaderHTML(selectedLooseItem.locationId, selectedLooseItem.itemId);
    const actions = selectedLooseItem.reservedBy
      ? '<div class="phase-sub">' + esc(t("ui.item.reservedBy")) + " " + esc(actorName(selectedLooseItem.reservedBy)) + "</div>"
      : takeActionsHTML();
    sheetBody.innerHTML = head + actions;
    return;
  }
  if (!selectedActorId) { sheetBody.replaceChildren(); return; }
  const a = activeEngine.getActor(selectedActorId);
  let html;
  if (selectedItemId && sheetMode === "idle") {
    html = itemHeaderHTML(a, selectedItemId) + itemActionsHTML(a);
  } else {
    html = actorHeaderHTML(a);
    if (sheetMode === "destination") html += destinationSheetHTML();
    else if (sheetMode === "means") html += meansSheetHTML(a);
    else if (sheetMode === "trade") html += tradeSheetHTML(a);
    else html += idleSheetHTML(a);
  }
  sheetBody.innerHTML = html;
}

function refresh() {
  if (selectedLooseItem && activeEngine && !looseItemAvailable(selectedLooseItem)) { selectedLooseItem = null; takeMode = false; }
  sheetEl.hidden = !(selectedActorId || selectedLooseItem);
  updateAvatarStates();
  renderSheet();
  renderInventory();
  renderMap();
  updateRunButton();
}

/* ---------- Transitions ---------- */

function selectActor(id) {
  selectedActorId = id;
  sheetMode = "idle";
  selectedDestId = null;
  listView = false;
  inventoryOpen = true;
  selectedItemId = null;
  giveMode = false;
  selectedLooseItem = null;
  takeMode = false;
  refresh();
  const a = activeEngine ? activeEngine.getActor(id) : null;
  if (a) mobileMap.focusLocation(a.activity.at);
}

function enterDestination() {
  const a = activeEngine.getActor(selectedActorId);
  if (!a || a.activity.kind !== "idle" || activeEngine.getPlan(a.id)) return;
  sheetMode = "destination";
  selectedDestId = null;
  listView = false;
  inventoryOpen = false;
  selectedItemId = null;
  giveMode = false;
  selectedLooseItem = null;
  takeMode = false;
  refresh();
}

function cancelDestination() {
  sheetMode = "idle";
  selectedDestId = null;
  listView = false;
  refresh();
}

function openTrades() {
  const a = activeEngine.getActor(selectedActorId);
  if (!a || a.activity.kind !== "idle" || activeEngine.getPlan(a.id)) return;
  sheetMode = "trade";
  inventoryOpen = false;
  selectedItemId = null;
  giveMode = false;
  selectedLooseItem = null;
  takeMode = false;
  refresh();
}

function cancelTrades() {
  sheetMode = "idle";
  refresh();
}

function tradeTerms(trade) {
  const cost = (trade.cost || []).map((e) => e.quantity + " × " + itemName(e.item)).join(" + ");
  const reward = (trade.reward || []).map((e) => e.quantity + " × " + itemName(e.item)).join(" + ");
  return cost + " " + t("ui.trade.cost") + " " + reward;
}

function doTrade(tradeId) {
  const a = activeEngine.getActor(selectedActorId);
  if (!a || !tradeId) return;
  const trade = activeEngine.getTrades(a.activity.at).find((tr) => tr.id === tradeId);
  if (!trade) return;
  openConfirm({
    title: t("ui.trade.title"),
    message: tradeTerms(trade),
    accept: t("ui.trade.title"),
    onAccept: () => { activeEngine.trade(a.id, a.activity.at, tradeId); refresh(); },
  });
}

function chooseDest(locId) {
  const a = activeEngine.getActor(selectedActorId);
  if (!a || locId === a.activity.at || activeEngine.distance(a.activity.at, locId) === Infinity) return;
  sheetMode = "means";
  selectedDestId = locId;
  selectedLooseItem = null;
  takeMode = false;
  refresh();
}

function backToDestination() {
  sheetMode = "destination";
  refresh();
}

function setPlan(dest, meanId) {
  sheetMode = "idle";
  selectedDestId = null;
  listView = false;
  selectedLooseItem = null;
  takeMode = false;
  activeEngine.setPlan(selectedActorId, dest, meanId);
  refresh();
}

function cancelPlan() {
  activeEngine.cancelPlan(selectedActorId);
  refresh();
}

/* ---------- Items ---------- */

function selectItem(itemId) {
  selectedLooseItem = null;
  takeMode = false;
  if (selectedItemId === itemId) {
    selectedItemId = null;
    giveMode = false;
  } else {
    selectedItemId = itemId;
    giveMode = false;
  }
  refresh();
}

function selectLooseItem(locationId, itemId, key, reservedBy) {
  if (sheetMode !== "idle") return;
  selectedActorId = null;
  selectedItemId = null;
  giveMode = false;
  takeMode = false;
  selectedLooseItem = { locationId, itemId, key, reservedBy: reservedBy || null };
  refresh();
}

function takeTo(actorId) {
  if (!selectedLooseItem) return;
  const item = activeEngine.getConfig().items[selectedLooseItem.itemId];
  if (!item) return;
  if (activeEngine.takeItem(actorId, item, 1)) {
    selectedLooseItem = null;
    takeMode = false;
  } else {
    showToast(t("ui.notice.planBlocked"));
  }
  refresh();
}

function giveTo(targetId) {
  const a = activeEngine.getActor(selectedActorId);
  if (!a || !selectedItemId) return;
  const item = activeEngine.getConfig().items[selectedItemId];
  if (!item) return;
  if (activeEngine.giveItem(a.id, targetId, item, 1)) {
    giveMode = false;
    if (activeEngine.getItemCount(a.id, selectedItemId) === 0) selectedItemId = null;
  } else {
    showToast(t("ui.notice.planBlocked"));
  }
  refresh();
}

function looseItemAvailable(sel) {
  const loc = activeEngine.getLocation(sel.locationId);
  if (!loc) return false;
  return (loc.items || []).some((it) => it.id === sel.itemId) ||
    (loc.reserved || []).some((r) => r.item.id === sel.itemId);
}

function onItemsChanged() {
  if (selectedItemId && activeEngine.getItemCount(selectedActorId, selectedItemId) === 0) selectedItemId = null;
  if (selectedLooseItem && !looseItemAvailable(selectedLooseItem)) { selectedLooseItem = null; takeMode = false; }
  refresh();
}

function dropItem() {
  const a = activeEngine.getActor(selectedActorId);
  if (!a || !selectedItemId) return;
  const item = activeEngine.getConfig().items[selectedItemId];
  if (!item) return;
  if (activeEngine.dropItem(a.id, item, 1)) {
    if (activeEngine.getItemCount(a.id, selectedItemId) === 0) selectedItemId = null;
  } else {
    showToast(t("ui.notice.planBlocked"));
  }
  refresh();
}

function handleLocationClick(locationId) {
  if (sheetMode === "destination") chooseDest(locationId);
}

function onPlansChanged() {
  refresh();
}

function onPlansCancelled() {
  showToast(t("ui.notice.plansCancelled"));
  if (activeEngine && !activeEngine.canAdvance()) stopAdvancing();
  refresh();
}

/* ============================ Advancing ============================ */

function startAdvancing() {
  if (advancing || !activeEngine || !activeEngine.canAdvance()) return;
  advancing = true;
  updateRunButton();
  advanceTimer = setInterval(tick, REAL_MS_PER_GAME_MIN);
}

function tick() {
  if (!titlesEl.hidden || !resultEl.hidden) return;
  const { completed, ended } = activeEngine.advance();
  if (completed.length > 0 || ended) stopAdvancing();
}

function stopAdvancing() {
  advancing = false;
  clearInterval(advanceTimer);
  advanceTimer = null;
  updateRunButton();
}

/* ============================ Events ============================ */

playBtn.addEventListener("click", () => enterGame());

titlesMissions.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-menu="mission"]');
  if (btn) requestMission(Number(btn.dataset.mission));
});

menuBtn.addEventListener("click", openMenu);

missionBtn.addEventListener("click", () => {
  if (briefingEl.hidden) showBriefing(false); else hideBriefing();
});

clockEl.addEventListener("click", (e) => { e.stopPropagation(); toggleDatePop(); });
document.addEventListener("click", (e) => {
  if (!datePop.hidden && !e.target.closest("#datePop") && !e.target.closest("#clockBtn")) hideDatePop();
});

briefingEl.addEventListener("click", (e) => { if (e.target.closest("[data-close-briefing]")) hideBriefing(); });

menuEl.addEventListener("click", (e) => {
  if (e.target.closest("[data-close-menu]")) { closeMenu(); return; }
  const btn = e.target.closest("[data-menu]");
  if (!btn) return;
  if (btn.dataset.menu === "briefing") { closeMenu(); showBriefing(false); }
  else if (btn.dataset.menu === "back") backToMenu();
  else if (btn.dataset.menu === "reset") {
    closeMenu();
    openConfirm({
      titleKey: "ui.confirm.restart.title",
      messageKey: "ui.confirm.restart.message",
      acceptKey: "ui.confirm.restart.accept",
      onAccept: restartMission,
    });
  }
});

runBtn.addEventListener("click", startAdvancing);

sheetBody.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "move") enterDestination();
  else if (action === "cancel-destination") cancelDestination();
  else if (action === "view-map") { listView = false; refresh(); }
  else if (action === "view-list") { listView = true; refresh(); }
  else if (action === "choose-dest") chooseDest(btn.dataset.loc);
  else if (action === "back-destination") backToDestination();
  else if (action === "choose-means") setPlan(selectedDestId, btn.dataset.mean);
  else if (action === "cancel-plan") cancelPlan();
  else if (action === "select-item") selectItem(btn.dataset.item);
  else if (action === "give") { giveMode = true; refresh(); }
  else if (action === "drop") dropItem();
  else if (action === "cancel-give") { giveMode = false; refresh(); }
  else if (action === "give-to") giveTo(btn.dataset.actor);
  else if (action === "take") { takeMode = true; refresh(); }
  else if (action === "cancel-take") { takeMode = false; refresh(); }
  else if (action === "take-to") takeTo(btn.dataset.actor);
  else if (action === "open-trades") openTrades();
  else if (action === "cancel-trades") cancelTrades();
  else if (action === "do-trade") doTrade(btn.dataset.trade);
});

inventoryBar.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  if (btn.dataset.action === "select-item") selectItem(btn.dataset.item);
});

btnRestart.addEventListener("click", restartMission);

btnBackMenu.addEventListener("click", backToMenu);

confirmAccept.addEventListener("click", () => { const a = confirmAction; closeConfirm(); if (a) a(); });
confirmCancel.addEventListener("click", closeConfirm);
confirmScrim.addEventListener("click", closeConfirm);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !confirmEl.hidden) closeConfirm();
});

/* ============================ Boot ============================ */

function boot() {
  const defaults = window.umbraDefaults || {};
  const games = window.games || {};
  const params = new URLSearchParams(window.location.search);
  const name = params.get("game") || defaults.game;
  if (!Object.prototype.hasOwnProperty.call(games, name)) {
    console.error("umbra: unknown game: " + name);
    return;
  }

  playBtn.disabled = false;
  document.documentElement.style.setProperty("--sheet-h", "auto");
  document.documentElement.dataset.cr = Flags.get("cr", "a1") === "a2" ? "a2" : "a1";
  loadGame(games[name].config);
  const requested = params.get("lang") || defaults.lang;
  const languages = activeI18n.languages();
  setLanguage(languages.includes(requested) ? requested : languages[0]);
  renderMissionButtons();
  updatePlayButton();
  showTitles();

  const missionParam = params.get("play");
  if (missionParam !== null && /^\d+$/.test(missionParam)) {
    enterGame(Number(missionParam) - 1);
  }
}

boot();

})();
