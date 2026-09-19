// Smoke test for the presentation i18n layer.
// Run with: node dev/smoke_i18n.js
"use strict";

const path = require("path");
const root = path.join(__dirname, "..");

global.window = global;
require(path.join(root, "umbra/umbra.js"));
require(path.join(root, "presentation/i18n.js"));

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
  en: { umbra: { mission: "Mission" }, menu: { play: "Play" }, briefing_labels: { goal: "Goal", hints: "Hints" } },
  es: { umbra: { mission: "Misión" }, briefing_labels: { goal: "Objetivo", hints: "Pistas" } },
};
const config = {
  languages: [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "pt", name: "Português" },
  ],
  translations: {
    en: {
      umbra: { mission: "Quest" },
      actors: { alice: { name: "Alice" } },
      missions: { test: { name: "Test" } },
    },
    es: { actors: { alice: { name: "Alicia" } } },
    pt: { menu: { play: "Jogar" }, actors: { alice: { name: "Alice" } }, briefing_labels: { goal: "Objetivo", hints: "Dicas" } },
  },
};

const i18n = window.Presentation.createI18n({ config, base });

check(JSON.stringify(i18n.languages()) === JSON.stringify(["en", "es", "pt"]), "languages come from the game only");
check(i18n.setLanguage("zz") === "en", "invalid language falls back to the first");
check(i18n.t("umbra.mission") === "Quest", "game translation overrides the base");
check(i18n.t("menu.play") === "Play", "base term resolves when the game does not override it");
check(i18n.t("umbra.missing") === "umbra.missing", "missing key returns the key");

check(window.Presentation.key("actors", "alice") === "actors.alice.name", "key defaults to the name field");
check(window.Presentation.key("missions", "test", "briefing") === "missions.test.briefing", "key uses the given field");
check(window.Presentation.resolveKey(".situation", "missions.test.briefing") === "missions.test.briefing.situation", "relative key resolves against the base");
check(window.Presentation.resolveKey("briefing_labels.goal", "missions.test.briefing") === "briefing_labels.goal", "absolute key ignores the base");

i18n.setLanguage("en");
check(i18n.t(window.Presentation.key("actors", "alice")) === "Alice", "entity name resolves (en)");
check(i18n.t(window.Presentation.key("missions", "test")) === "Test", "mission name resolves (en)");

i18n.setLanguage("es");
check(i18n.t(window.Presentation.key("actors", "alice")) === "Alicia", "entity name resolves (es)");
check(i18n.t(window.Presentation.key("actors", "bob")) === "actors.bob.name", "missing entity name returns the key");

check(i18n.t("briefing_labels.goal") === "Objetivo", "base briefing label resolves (es)");
i18n.setLanguage("pt");
check(i18n.t("briefing_labels.hints") === "Dicas", "game override of a base label resolves (pt)");

const german = window.Presentation.createI18n({
  config: { languages: [{ code: "de", name: "Deutsch" }] },
  base: window.Umbra.baseTranslations,
});
german.setLanguage("de");
check(german.t("briefing_labels.goal") === "Ziel", "German label comes from the Umbra base");
check(german.t("briefing_labels.hints") === "Hinweise", "German hints label comes from the Umbra base");

if (failures > 0) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("all checks passed");
