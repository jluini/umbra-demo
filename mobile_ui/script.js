// Mobile UI controller (host).
// Dependencies:
//   common/utils.js          (Utils.buildKey)
//   umbra/umbra.js           (Umbra)
//   presentation/i18n.js     (Presentation.createI18n)
//   presentation/i18n-dom.js (Presentation.setI18nText, Presentation.applyI18n)
//   presentation/format.js   (Presentation.formatDateTime)
//   presentation/richtext.js (Presentation.renderRichText)
(() => {
"use strict";

const uiTranslations = {
  es: {
    ui: {
      start: "Comenzar",
      viewBriefing: "Ver briefing",
      victory: "Misión cumplida",
      defeat: "Misión fallida",
      restart: "Reiniciar",
      backToMenu: "Volver al menú",
      confirmAbortTitle: "¿Abortar la misión?",
      confirmAbortMessage: "Vas a perder el progreso y volver al menú.",
      confirmRestartTitle: "¿Reiniciar la misión?",
      confirmRestartMessage: "Vas a perder el progreso actual y la misión comenzará de nuevo.",
      moveTo: "Moverse a…",
      chooseDestination: "Elegir destino",
      map: "Mapa",
      list: "Lista",
      goTo: "Ir a",
      chooseDestHint: "Tocá un lugar alcanzable en el mapa. Los atenuados no tienen ruta.",
      tripInfo: "de viaje · elegí cómo ir",
      arrives: "llega",
      onTheWayTo: "En camino a",
    },
  },
  // TODO: en
  // TODO: pt
};

const titlesEl = document.getElementById("titles");
const briefingEl = document.getElementById("briefing");
const menuEl = document.getElementById("menu");
const resultEl = document.getElementById("result");
const confirmEl = document.getElementById("confirm");

const playBtn = document.getElementById("playBtn");
const langSelector = document.getElementById("lang-selector");
const menuBtn = document.getElementById("menuBtn");
const missionBtn = document.getElementById("missionBtn");
const missionNumber = document.getElementById("mission-number");
const missionTitle = document.getElementById("mission-title");
const clockEl = document.getElementById("clockBtn");
const runBtn = document.getElementById("runBtn");
const datePop = document.getElementById("datePop");

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
let sheetMode = "idle"; // idle | destination | means
let selectedDestId = null;
let listView = false;

const REAL_MS_PER_GAME_MIN = 250;

const mobileMap = MobileMap.create(mapEl, {
  onLocationClick: handleLocationClick,
  onTokenClick: (id) => selectActor(id),
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
  if (selectedActorId) refresh();
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

function showBriefing() { briefingEl.hidden = false; }
function hideBriefing() { briefingEl.hidden = true; }

function openMenu() { menuEl.hidden = false; }
function closeMenu() { menuEl.hidden = true; }

function showResult() { resultEl.hidden = false; }
function hideResult() { resultEl.hidden = true; }

function openConfirm({ titleKey, messageKey, acceptKey, onAccept }) {
  confirmAction = onAccept;
  Presentation.setI18nText(confirmTitle, titleKey, activeI18n);
  Presentation.setI18nText(confirmMessage, messageKey, activeI18n);
  Presentation.setI18nText(confirmAccept, acceptKey, activeI18n);
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

  const hasMissions = Array.isArray(gameConfig.missions) && gameConfig.missions.length > 0;
  activeEngine = hasMissions ? Umbra.create(gameConfig) : null;
  if (activeEngine) {
    activeEngine.on("mission:start", onMissionStart);
    activeEngine.on("clock:set", onClockSet);
    activeEngine.on("plan:set", onPlansChanged);
    activeEngine.on("plan:cancel", onPlansChanged);
    activeEngine.on("plans:started", onPlansChanged);
    activeEngine.on("plans:completed", onPlansChanged);
    activeEngine.on("mission:end", onMissionEnd);
    activeEngine.on("mission:reset", resetGameUI);
  }
}

function startGame(missionIndex) {
  if (activeEngine) activeEngine.start(missionIndex);
  else hideTitles();
}

function enterGame(missionIndex) {
  if (!started) {
    started = true;
    startGame(missionIndex);
  } else {
    hideTitles();
  }
}

function restartMission() {
  if (!activeEngine) return;
  hideResult();
  activeEngine.stop();
  activeEngine.start(currentMissionIndex);
}

function backToMenu() {
  if (activeEngine) activeEngine.stop();
  started = false;
  hideResult();
  closeMenu();
  hideBriefing();
  hideDatePop();
  showTitles();
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
  showBriefing();
}

function onClockSet({ time }) {
  activeClock = time;
  updateClockText();
  refresh();
}

function onMissionEnd(ending) {
  Presentation.setI18nText(resultTitle, "ui." + ending.effect, activeI18n);
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
  sheetEl.hidden = true;
  sheetBody.replaceChildren();
  avatarsEl.replaceChildren();
  updateRunButton();
}

/* ============================ Map / avatars / sheet ============================ */

const t = (key) => activeI18n.t(key);
const lang = () => activeI18n.language();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function actorName(id) {
  return activeI18n.t(Utils.buildKey("actors", id, "name"));
}
function locationName(id) {
  return activeI18n.t(Utils.buildKey("locations", id, "name"));
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
    const entry = { id: l.id, map: l.map, pictureUrl: l.pictureUrl };
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

  return { locations, routes, tokens };
}

function renderMap() {
  if (activeEngine) mobileMap.render(buildScene(), activeI18n);
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
    return '<div class="activity"><span>🚶</span><div class="grow">' + esc(t("ui.onTheWayTo")) +
      " <b>" + esc(locationName(a.activity.to)) + "</b><small>" + elapsed + "/" + a.activity.duration +
      " min</small></div></div>" + '<div class="progress"><i style="width:' + pct + '%"></i></div>';
  }
  const plan = activeEngine.getPlan(a.id);
  if (plan) {
    const arrival = new Date(activeEngine.getClock().getTime() + plan.duration * 60000);
    return '<div class="activity"><span>🚶</span><div class="grow">→ <b>' + esc(locationName(plan.destination)) +
      "</b><small>" + Presentation.formatDuration(plan.duration) + " · " + esc(t("ui.arrives")) + " " +
      Presentation.formatDateTime(arrival, lang(), "time") + "</small></div>" +
      '<button class="x" data-action="cancel-plan">✕</button></div>';
  }
  return '<button class="primary" data-action="move">' + esc(t("ui.moveTo")) + "</button>";
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
    '<span class="phase-title">' + esc(t("ui.chooseDestination")) + "</span>" +
    '<span class="seg">' +
    '<button class="' + (listView ? "" : "on") + '" data-action="view-map">' + esc(t("ui.map")) + "</button>" +
    '<button class="' + (listView ? "on" : "") + '" data-action="view-list">' + esc(t("ui.list")) + "</button>" +
    "</span></div>";
  if (listView) {
    html += '<div class="dest-list">' + reachableList().map((r) =>
      '<button class="dest-row" data-action="choose-dest" data-loc="' + r.loc.id + '">' +
      '<span class="dn">' + esc(locationName(r.loc.id)) + '</span><span class="dd">' +
      Presentation.formatDistance(r.d) + "</span></button>").join("") + "</div>";
  } else {
    html += '<div class="phase-sub">' + esc(t("ui.chooseDestHint")) + "</div>";
  }
  return html;
}

function meansSheetHTML(a) {
  const d = activeEngine.distance(a.activity.at, selectedDestId);
  const duration = activeEngine.computeWalkTime(d);
  const arrival = new Date(activeEngine.getClock().getTime() + duration * 60000);
  const mean = (activeEngine.getConfig().means || {}).walk || { icon: "🚶" };
  return '<div class="phase-bar">' +
    '<button class="icon-btn" data-action="back-destination">←</button>' +
    '<span class="phase-title">' + esc(t("ui.goTo")) + " <b>" + esc(locationName(selectedDestId)) + "</b></span></div>" +
    '<div class="phase-sub">' + Presentation.formatDistance(d) + " " + esc(t("ui.tripInfo")) + "</div>" +
    '<div class="means-list">' +
    '<button class="mean-row" data-action="choose-means" data-mean="walk">' +
    '<span class="mi">' + (mean.icon || "🚶") + "</span>" +
    '<span class="mn">' + esc(t("means.walk.name")) + "</span>" +
    '<span class="mm"><b>' + Presentation.formatDuration(duration) + "</b><small>" + esc(t("ui.arrives")) + " " +
    Presentation.formatDateTime(arrival, lang(), "time") + "</small></span></button></div>";
}

function renderSheet() {
  if (!selectedActorId || !activeEngine) { sheetBody.replaceChildren(); return; }
  const a = activeEngine.getActor(selectedActorId);
  let html = actorHeaderHTML(a);
  if (sheetMode === "destination") html += destinationSheetHTML();
  else if (sheetMode === "means") html += meansSheetHTML(a);
  else html += idleSheetHTML(a);
  sheetBody.innerHTML = html;
}

function refresh() {
  sheetEl.hidden = !selectedActorId;
  updateAvatarStates();
  renderSheet();
  renderMap();
  updateRunButton();
}

/* ---------- Transitions ---------- */

function selectActor(id) {
  selectedActorId = id;
  sheetMode = "idle";
  selectedDestId = null;
  listView = false;
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
  refresh();
}

function cancelDestination() {
  sheetMode = "idle";
  selectedDestId = null;
  listView = false;
  refresh();
}

function chooseDest(locId) {
  const a = activeEngine.getActor(selectedActorId);
  if (!a || locId === a.activity.at || activeEngine.distance(a.activity.at, locId) === Infinity) return;
  sheetMode = "means";
  selectedDestId = locId;
  refresh();
}

function backToDestination() {
  sheetMode = "destination";
  refresh();
}

function setPlan(dest) {
  sheetMode = "idle";
  selectedDestId = null;
  listView = false;
  activeEngine.setPlan(selectedActorId, dest);
  refresh();
}

function cancelPlan() {
  activeEngine.cancelPlan(selectedActorId);
  refresh();
}

function handleLocationClick(locationId) {
  if (sheetMode === "destination") chooseDest(locationId);
}

function onPlansChanged() {
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

menuBtn.addEventListener("click", openMenu);

missionBtn.addEventListener("click", () => {
  if (briefingEl.hidden) showBriefing(); else hideBriefing();
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
  if (btn.dataset.menu === "briefing") { closeMenu(); showBriefing(); }
  else if (btn.dataset.menu === "back") backToMenu();
  else if (btn.dataset.menu === "reset") {
    closeMenu();
    openConfirm({
      titleKey: "ui.confirmRestartTitle",
      messageKey: "ui.confirmRestartMessage",
      acceptKey: "ui.restart",
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
  else if (action === "choose-means") setPlan(selectedDestId);
  else if (action === "cancel-plan") cancelPlan();
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
  loadGame(games[name].config);
  const requested = params.get("lang") || defaults.lang;
  const languages = activeI18n.languages();
  setLanguage(languages.includes(requested) ? requested : languages[0]);
  showTitles();

  const missionParam = params.get("play");
  if (missionParam !== null && /^\d+$/.test(missionParam)) {
    enterGame(Number(missionParam) - 1);
  }
}

boot();

})();
