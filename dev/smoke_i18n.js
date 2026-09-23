// Smoke test for the presentation i18n layer.
// Run with: node dev/smoke_i18n.js
"use strict";

const path = require("path");
const root = path.join(__dirname, "..");

global.window = global;
require(path.join(root, "common/utils.js"));
require(path.join(root, "umbra/umbra.js"));
require(path.join(root, "presentation/i18n.js"));
require(path.join(root, "presentation/i18n-dom.js"));

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
  en: { umbra: { mission: "Mission" }, menu: { play: "Play" }, briefingLabels: { goal: "Goal", hints: "Hints" }, plan: { walkTo: "Walk to...", cancel: "Cancel" } },
  es: { umbra: { mission: "Misión" }, briefingLabels: { goal: "Objetivo", hints: "Pistas" }, plan: { walkTo: "Caminar a...", cancel: "Cancelar" } },
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
    pt: { menu: { play: "Jogar" }, actors: { alice: { name: "Alice" } }, briefingLabels: { goal: "Objetivo", hints: "Dicas" }, plan: { walkTo: "Caminhar até...", cancel: "Cancelar" } },
  },
};

const i18n = window.Presentation.createI18n({
  languages: config.languages.map((lang) => lang.code),
  dictionaries: [base, config.translations],
});

check(JSON.stringify(i18n.languages()) === JSON.stringify(["en", "es", "pt"]), "languages come from the game only");
check(i18n.setLanguage("zz") === "en", "invalid language falls back to the first");
check(i18n.t("umbra.mission") === "Quest", "game translation overrides the base");
check(i18n.t("menu.play") === "Play", "base term resolves when the game does not override it");
check(i18n.t("umbra.missing") === "umbra.missing", "missing key returns the key");

check(window.Utils.buildKey("actors", "alice") === "actors.alice.name", "key defaults to the name field");
check(window.Utils.buildKey("missions", "test", "briefing") === "missions.test.briefing", "key uses the given field");
check(window.Utils.resolveKey(".situation", "missions.test.briefing") === "missions.test.briefing.situation", "relative key resolves against the base");
check(window.Utils.resolveKey("briefingLabels.goal", "missions.test.briefing") === "briefingLabels.goal", "absolute key ignores the base");

i18n.setLanguage("en");
check(i18n.t(window.Utils.buildKey("actors", "alice")) === "Alice", "entity name resolves (en)");
check(i18n.t(window.Utils.buildKey("missions", "test")) === "Test", "mission name resolves (en)");

i18n.setLanguage("es");
check(i18n.t(window.Utils.buildKey("actors", "alice")) === "Alicia", "entity name resolves (es)");
check(i18n.t(window.Utils.buildKey("actors", "bob")) === "actors.bob.name", "missing entity name returns the key");

check(i18n.t("briefingLabels.goal") === "Objetivo", "base briefing label resolves (es)");
check(i18n.t("plan.walkTo") === "Caminar a...", "base plan label resolves (es)");
i18n.setLanguage("pt");
check(i18n.t("briefingLabels.hints") === "Dicas", "game override of a base label resolves (pt)");

const german = window.Presentation.createI18n({
  languages: ["de"],
  dictionaries: [window.Umbra.baseTranslations],
});
german.setLanguage("de");
check(german.t("briefingLabels.goal") === "Ziel", "German label comes from the Umbra base");
check(german.t("briefingLabels.hints") === "Hinweise", "German hints label comes from the Umbra base");
check(german.t("plan.cancel") === "Abbrechen", "German plan label comes from the Umbra base");

// --- i18n DOM binding (minimal DOM stub, no dependencies) ---
const P = window.Presentation;
const makeEl = (attrs = {}) => {
  const map = { ...attrs };
  return {
    textContent: "",
    getAttribute: (name) => (name in map ? map[name] : null),
    setAttribute: (name, value) => { map[name] = value; },
    hasAttribute: (name) => name in map,
  };
};

i18n.setLanguage("es");

const el = makeEl({ "data-i18n": "plan.walkTo", "data-i18n-title": "plan.cancel" });
P.translateElement(el, i18n);
check(el.textContent === "Caminar a...", "translateElement translates textContent");
check(el.getAttribute("title") === "Cancelar", "translateElement translates title");

const elIgnored = makeEl({ "data-i18n-foo": "plan.cancel" });
P.translateElement(elIgnored, i18n);
check(elIgnored.getAttribute("foo") === null, "translateElement ignores attributes outside I18N_ATTRS");

const elText = makeEl();
P.setI18nText(elText, "plan.walkTo", i18n);
check(elText.getAttribute("data-i18n") === "plan.walkTo" && elText.textContent === "Caminar a...", "setI18nText sets key and text");

const elAttr = makeEl();
P.setI18nAttr(elAttr, "aria-label", "plan.cancel", i18n);
check(elAttr.getAttribute("data-i18n-aria-label") === "plan.cancel" && elAttr.getAttribute("aria-label") === "Cancelar", "setI18nAttr sets key and attribute");

let rejected = false;
try { P.setI18nAttr(makeEl(), "foo", "plan.cancel", i18n); } catch (e) { rejected = true; }
check(rejected, "setI18nAttr rejects unsupported attributes");

let selector = null;
P.applyI18n({ querySelectorAll: (sel) => { selector = sel; return [el]; } }, i18n);
check(
  selector.includes("[data-i18n]") &&
  selector.includes("[data-i18n-title]") &&
  selector.includes("[data-i18n-alt]") &&
  selector.includes("[data-i18n-placeholder]") &&
  selector.includes("[data-i18n-aria-label]"),
  "applyI18n queries text and every I18N_ATTRS attribute"
);

if (failures > 0) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("all checks passed");
