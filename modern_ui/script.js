(() => {
"use strict";

// Elements
const overlay = document.getElementById("overlay");
const missionBar = document.querySelector(".mission-bar");

// Buttons
const btnPlay = document.getElementById("btn-play");
const btnCredits = document.getElementById("btn-credits");
const btnAbout = document.getElementById("btn-about");
const btnShowBriefing = document.getElementById("btn-show-briefing");
const btnShowMenu = document.getElementById("btn-show-menu");
const btnCloseBriefing = document.getElementById("btn-close-briefing");

function showOverlay() {
  overlay.classList.add("active");
}

function hideOverlay() {
  overlay.classList.remove("active");
}

// Play → hide overlay, show game
btnPlay.addEventListener("click", () => {
  hideOverlay();
});

// Fake buttons
btnCredits.addEventListener("click", () => {
  alert("Credits — not implemented yet");
});

btnAbout.addEventListener("click", () => {
  alert("About — not implemented yet");
});

// Game top bar: toggle briefing
btnShowBriefing.addEventListener("click", () => {
  missionBar.classList.toggle("hidden");
  btnShowBriefing.classList.toggle("active");
});

// Close briefing button
btnCloseBriefing.addEventListener("click", () => {
  missionBar.classList.add("hidden");
  btnCloseBriefing.classList.add("hidden");
  btnShowBriefing.classList.remove("active");
  btnShowBriefing.classList.add("shine");
  setTimeout(() => btnShowBriefing.classList.remove("shine"), 600);
});

// Game top bar: show Menu
btnShowMenu.addEventListener("click", () => {
  btnPlay.textContent = "▶ Continue";
  showOverlay();
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
