// i18n core: language state, dictionary and translation lookup. DOM-free.
// Dependencies: common/utils.js (Utils.deepMerge, Utils.getPath).
(() => {
"use strict";

const createI18n = ({ languages = [], dictionaries = [] } = {}) => {
  const codes = languages.filter(Boolean);
  const dictionary = {};
  for (const code of codes) {
    dictionary[code] = dictionaries.reduce(
      (acc, dict) => Utils.deepMerge(acc, (dict && dict[code]) || {}),
      {}
    );
  }

  let current = null;
  const listeners = {};

  const i18n = {
    languages() { return languages.slice(); },
    language() { return current; },
    setLanguage(code) {
      if (languages.length === 0) {
        current = null;
        return null;
      }
      if (!languages.includes(code)) code = languages[0];
      current = code;
      i18n.emit("language:set", { language: current });
      return current;
    },
    t(key, params) {
      const value = Utils.getPath(dictionary[current], key);
      if (value === undefined) return key;
      if (typeof value !== "string" || !params) return value;
      return value.replace(/\{(\w+)\}/g, (m, name) => (params[name] != null ? String(params[name]) : m));
    },
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
  };
  return i18n;
};

const languageName = (code) => {
  if (!code) return "";
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    return (name || code).toLowerCase();
  } catch {
    return String(code).toLowerCase();
  }
};

window.Presentation = window.Presentation || {};
window.Presentation.createI18n = createI18n;
window.Presentation.languageName = languageName;
})();
