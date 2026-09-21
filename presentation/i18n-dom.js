// i18n DOM binding: applies translations to DOM elements via data-i18n.
// Dependencies: none (uses the DOM and the i18n instance passed in).
(() => {
"use strict";

const translateElement = (el, i18n) => {
  const key = el.getAttribute("data-i18n");
  if (key) el.textContent = i18n.t(key);
};

const setI18nKey = (el, key, i18n) => {
  el.setAttribute("data-i18n", key);
  el.textContent = i18n.t(key);
};

const applyI18n = (root, i18n) => {
  root.querySelectorAll("[data-i18n]").forEach((el) => translateElement(el, i18n));
};

window.Presentation = window.Presentation || {};
//window.Presentation.translateElement = translateElement;
window.Presentation.setI18nKey = setI18nKey;
window.Presentation.applyI18n = applyI18n;
})();
