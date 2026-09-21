// i18n core: language state, dictionary and translation lookup. DOM-free.
// Dependencies: common/utils.js (Utils.deepMerge, Utils.getPath).
(() => {
"use strict";

const createI18n = ({ config = {}, base = {} } = {}) => {
  const languages = (config.languages || []).map((lang) => lang.code).filter(Boolean);
  const dictionary = {};
  for (const code of languages) {
    dictionary[code] = Utils.deepMerge(base[code] || {}, config.translations?.[code] || {});
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
    t(key) {
      const value = Utils.getPath(dictionary[current], key);
      return value === undefined ? key : value;
    },
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
  };
  return i18n;
};

window.Presentation = window.Presentation || {};
window.Presentation.createI18n = createI18n;
})();
