(() => {
"use strict";

// Elements
const overlay = document.getElementById("overlay");
const screenTitles = document.getElementById("screen-titles");
const screenBriefing = document.getElementById("screen-briefing");

// Buttons
const btnPlay = document.getElementById("btn-play");
const btnCredits = document.getElementById("btn-credits");
const btnAbout = document.getElementById("btn-about");
const btnBackToTitles = document.getElementById("btn-back-to-titles");
const btnStartGame = document.getElementById("btn-start-game");
const btnShowBriefing = document.getElementById("btn-show-briefing");
const btnShowMenu = document.getElementById("btn-show-menu");
const btnPlayGame = document.getElementById("btn-play-game");

function showScreen(screen) {
  screenTitles.classList.remove("active");
  screenBriefing.classList.remove("active");
  screen.classList.add("active");
}

function showOverlay() {
  overlay.classList.add("active");
}

function hideOverlay() {
  overlay.classList.remove("active");
}

// Play → Briefing
btnPlay.addEventListener("click", () => {
  showScreen(screenBriefing);
});

// Fake buttons
btnCredits.addEventListener("click", () => {
  alert("Credits — not implemented yet");
});

btnAbout.addEventListener("click", () => {
  alert("About — not implemented yet");
});

// Back → Titles
btnBackToTitles.addEventListener("click", () => {
  showScreen(screenTitles);
});

// Start Game → hide overlay
btnStartGame.addEventListener("click", () => {
  hideOverlay();
});

// Game top bar: show Briefing
btnShowBriefing.addEventListener("click", () => {
  showScreen(screenBriefing);
  showOverlay();
});

// Game top bar: show Menu
btnShowMenu.addEventListener("click", () => {
  btnPlay.textContent = "▶ Continue";
  showScreen(screenTitles);
  showOverlay();
});

// Play button in controls bar
btnPlayGame.addEventListener("click", () => {
  // TODO: connect to engine
  alert("Play — not connected to engine yet");
});

// Language buttons
document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lang-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    // TODO: call game.setLanguage(btn.dataset.lang)
  });
});

})();
