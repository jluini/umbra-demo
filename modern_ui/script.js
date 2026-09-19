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
const clockEl = document.getElementById("clock");

let activeI18n = null;
let activeEngine = null;
let activeClock = null;
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

function updateClockText() {
  if (activeClock) clockEl.textContent = Presentation.formatDateTime(activeClock, activeI18n.language());
}

function onMissionStart({ mission }) {
  renderMission(mission);
  Presentation.renderRichText(missionBriefing, mission.briefing, activeI18n, "briefing");
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

  const playable = Array.isArray(config.levels) && config.levels.length > 0;
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
