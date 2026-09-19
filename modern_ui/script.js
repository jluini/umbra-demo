(() => {
"use strict";

const overlay = document.getElementById("overlay");
const btnPlay = document.getElementById("btn-play");
const btnCredits = document.getElementById("btn-credits");
const btnAbout = document.getElementById("btn-about");
const btnShowMenu = document.getElementById("btn-show-menu");

function showOverlay() {
  overlay.classList.add("active");
}

function hideOverlay() {
  overlay.classList.remove("active");
}

function loadGame(config) {
  // Languages
  const langSelector = document.getElementById("lang-selector");
  config.languages.forEach((lang, i) => {
    const btn = document.createElement("button");
    btn.className = "lang-btn" + (i === 0 ? " active" : "");
    btn.dataset.lang = lang.code;
    btn.textContent = lang.name;
    langSelector.appendChild(btn);
  });

  // Future: load briefing, locations, actors, etc.
}

btnPlay.addEventListener("click", hideOverlay);

btnCredits.addEventListener("click", () => {
  alert("Credits — not implemented yet");
});

btnAbout.addEventListener("click", () => {
  alert("About — not implemented yet");
});

btnShowMenu.addEventListener("click", () => {
  btnPlay.textContent = "▶ Continue";
  showOverlay();
});

// Event delegation for language buttons
document.getElementById("lang-selector").addEventListener("click", (e) => {
  const btn = e.target.closest(".lang-btn");
  if (!btn) return;
  document.querySelectorAll(".lang-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  // TODO: call game.setLanguage(btn.dataset.lang)
});

// Exports
window.loadGame = loadGame;

})();
