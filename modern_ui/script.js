(() => {
"use strict";

const overlay = document.getElementById("overlay");
const btnPlay = document.getElementById("btn-play");
const btnCredits = document.getElementById("btn-credits");
const btnAbout = document.getElementById("btn-about");
const btnShowMenu = document.getElementById("btn-show-menu");

let activeI18n = null;
let started = false;

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

function loadGame(config) {
  config = config || {};
  const langSelector = document.getElementById("lang-selector");
  const i18n = Presentation.createI18n({ config, base: Umbra.baseTranslations });
  activeI18n = i18n;

  langSelector.replaceChildren();
  for (const lang of config.languages || []) {
    const btn = document.createElement("button");
    btn.className = "lang-btn";
    btn.dataset.lang = lang.code;
    btn.textContent = lang.name;
    langSelector.appendChild(btn);
  }

  const setLanguage = (code) => {
    const active = i18n.setLanguage(code);
    if (!active) return;
    langSelector.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === active);
    });
    Presentation.applyI18n(document, i18n);
  };

  langSelector.addEventListener("click", (e) => {
    const btn = e.target.closest(".lang-btn");
    if (btn) setLanguage(btn.dataset.lang);
  });

  return { setLanguage, languages: () => i18n.languages() };
}

btnPlay.addEventListener("click", () => {
  if (!started) {
    started = true;
    setPlayLabel("menu.continue");
  }
  hideOverlay();
});

btnCredits.addEventListener("click", () => {
  alert("Credits — not implemented yet");
});

btnAbout.addEventListener("click", () => {
  alert("About — not implemented yet");
});

btnShowMenu.addEventListener("click", showOverlay);

// Exports
window.loadGame = loadGame;

})();
