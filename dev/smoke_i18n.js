// Smoke test for the presentation layer (i18n + DOM binding).
// Run with: node dev/smoke_i18n.js
"use strict";

const path = require("path");
const root = path.join(__dirname, "..");

global.window = global;
require(path.join(root, "presentation/i18n.js"));
require(path.join(root, "presentation/dom.js"));

let failures = 0;
const check = (cond, label) => {
  if (cond) {
    console.log("ok   " + label);
  } else {
    failures++;
    console.error("FAIL " + label);
  }
};

const base = {
  en: { umbra: { mission: "Mission" }, menu: { play: "Play" } },
  es: { umbra: { mission: "Misión" } },
};
const config = {
  languages: [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "pt", name: "Português" },
  ],
  translations: {
    en: { umbra: { mission: "Quest" } },
    pt: { menu: { play: "Jogar" } },
  },
};

const i18n = window.Presentation.createI18n({ config, base });

check(JSON.stringify(i18n.languages()) === JSON.stringify(["en", "es", "pt"]), "languages come from the game only");
check(i18n.setLanguage("zz") === "en", "invalid language falls back to the first");
check(i18n.t("umbra.mission") === "Quest", "game translation overrides the base");
check(i18n.t("menu.play") === "Play", "base term resolves when the game does not override it");
check(i18n.t("umbra.missing") === "umbra.missing", "missing key returns the key");

check(i18n.resolveName("Same") === "Same", "resolveName passes strings through");
i18n.setLanguage("es");
check(i18n.resolveName({ en: "Test", es: "Prueba" }) === "Prueba", "resolveName uses the current language");
check(i18n.resolveName({ en: "OnlyEn" }) === "OnlyEn", "resolveName falls back to en");

const makeEl = () => ({ isConnected: true, textContent: "" });

const title = makeEl();
window.Presentation.bindText(title, { en: "Test", es: "Prueba" }, i18n);
check(title.textContent === "Prueba", "bindText renders a value in the current language");
i18n.setLanguage("en");
window.Presentation.refreshBoundText(i18n);
check(title.textContent === "Test", "refreshBoundText updates a value binding");

const clock = makeEl();
window.Presentation.bindText(clock, (t) => "lang:" + t.language(), i18n);
check(clock.textContent === "lang:en", "bindText supports a function source");
i18n.setLanguage("es");
window.Presentation.refreshBoundText(i18n);
check(clock.textContent === "lang:es", "refreshBoundText re-runs a function binding");

let calls = 0;
const stale = makeEl();
window.Presentation.bindText(stale, () => { calls++; return "x"; }, i18n);
stale.isConnected = false;
window.Presentation.refreshBoundText(i18n);
check(calls === 1, "disconnected elements are not refreshed");

if (failures > 0) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("all checks passed");
