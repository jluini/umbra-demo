(() => {
"use strict";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const deepMerge = (base, override) => {
  const out = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    out[key] = isPlainObject(out[key]) && isPlainObject(value)
      ? deepMerge(out[key], value)
      : value;
  }
  return out;
};

const getPath = (obj, path) => {
  let node = obj;
  for (const part of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return node;
};

const createI18n = ({ config = {}, base = {} } = {}) => {
  const languages = (config.languages || []).map((lang) => lang.code).filter(Boolean);
  const dictionary = {};
  for (const code of languages) {
    dictionary[code] = deepMerge(base[code] || {}, config.translations?.[code] || {});
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
      const value = getPath(dictionary[current], key);
      return value === undefined ? key : value;
    },
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
  };
  return i18n;
};

const key = (type, id, field = "name") => type + "." + id + "." + field;

window.Presentation = window.Presentation || {};
window.Presentation.createI18n = createI18n;
window.Presentation.key = key;
})();
