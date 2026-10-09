// Mobile UI controller (host).
// Dependencies:
//   common/utils.js          (Utils.buildKey)
//   umbra/umbra.js           (Umbra)
//   presentation/i18n.js     (Presentation.createI18n)
//   presentation/i18n-dom.js (Presentation.setI18nText, Presentation.applyI18n)
//   presentation/format.js   (Presentation.formatDateTime)
//   presentation/richtext.js (Presentation.renderRichText)
//   translations.js          (window.MobileTranslations)
//   scene.js                 (window.MobileScene)
//   avatars.js               (window.MobileAvatars)
//   sheet.js                 (window.MobileSheet)
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

const REAL_MS_PER_GAME_MIN = 250;

const mobileMap = MobileMap.create(mapEl, {
  onLocationClick: handleLocationClick,
  onTokenClick: (id) => selectActor(id),
  onItemClick: (locId, itemId, key, reservedBy) => selectLooseItem(locId, itemId, key, reservedBy),
  bottomInset: () => (sheetEl.hidden ? 0 : sheetEl.getBoundingClientRect().height),
  renderAvatar,
});

const avatars = MobileAvatars.create({
  container: avatarsEl,
  getEngine: () => activeEngine,
  getSelectedId: () => selectedActorId,
  actorName,
  renderAvatar,
  onSelect: selectActor,
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
  avatars.build();
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

function renderMap() {
  if (!activeEngine) return;
  const scene = MobileScene.build({
    engine: activeEngine,
    selectedActorId,
    sheetMode,
    selectedLooseItem,
    actorName,
    itemName,
    itemIconHTML,
    formatDistance: Presentation.formatDistance,
  });
  mobileMap.render(scene, activeI18n);
}

const sheet = MobileSheet.create({
  sheetBody,
  inventoryBar,
  getEngine: () => activeEngine,
  getState: () => ({ selectedActorId, selectedItemId, giveMode, takeMode, selectedLooseItem, selectedDestId, listView, sheetMode, inventoryOpen }),
  helpers: { esc, itemIconHTML, actorName, locationName, itemName, meanName, meanIcon, t, lang,
             formatDuration: Presentation.formatDuration, formatDistance: Presentation.formatDistance, formatDateTime: Presentation.formatDateTime },
});

function refresh() {
  if (selectedLooseItem && activeEngine && !looseItemAvailable(selectedLooseItem)) { selectedLooseItem = null; takeMode = false; }
  sheetEl.hidden = !(selectedActorId || selectedLooseItem);
  avatars.updateStates();
  sheet.renderSheet();
  sheet.renderInventory();
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
