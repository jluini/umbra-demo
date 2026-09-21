// i18n DOM binding: applies translations to DOM elements via data-i18n.
// Dependencies: none (uses the DOM and the i18n instance passed in).
(() => {
"use strict";

// Attributes that can be translated with data-i18n-<attr>.
const I18N_ATTRS = ["title", "alt", "placeholder", "aria-label"];
const I18N_SELECTOR = ["[data-i18n]", ...I18N_ATTRS.map((attr) => `[data-i18n-${attr}]`)].join(", ");

const translateElement = (el, i18n) => {
  const key = el.getAttribute("data-i18n");
  if (key) el.textContent = i18n.t(key);
  for (const attr of I18N_ATTRS) {
    const attrKey = el.getAttribute("data-i18n-" + attr);
    if (attrKey) el.setAttribute(attr, i18n.t(attrKey));
  }
};

const setI18nText = (el, key, i18n) => {
  el.setAttribute("data-i18n", key);
  el.textContent = i18n.t(key);
};

const setI18nAttr = (el, attr, key, i18n) => {
  if (!I18N_ATTRS.includes(attr)) {
    throw new Error("i18n: unsupported attribute '" + attr + "'");
  }
  el.setAttribute("data-i18n-" + attr, key);
  el.setAttribute(attr, i18n.t(key));
};

const applyI18n = (root, i18n) => {
  root.querySelectorAll(I18N_SELECTOR).forEach((el) => translateElement(el, i18n));
};

window.Presentation = window.Presentation || {};
window.Presentation.translateElement = translateElement;
window.Presentation.setI18nText = setI18nText;
window.Presentation.setI18nAttr = setI18nAttr;
window.Presentation.applyI18n = applyI18n;
})();