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

const resolveSource = (source, i18n) =>
  typeof source === "function" ? source(i18n) : i18n.resolveName(source);

const boundText = new Set();
const boundSources = new WeakMap();

const bindText = (el, source, i18n) => {
  boundText.add(el);
  boundSources.set(el, source);
  el.textContent = resolveSource(source, i18n);
};

const refreshBoundText = (i18n) => {
  for (const el of boundText) {
    if (!el.isConnected) {
      boundText.delete(el);
      continue;
    }
    el.textContent = resolveSource(boundSources.get(el), i18n);
  }
};

window.Presentation = window.Presentation || {};
window.Presentation.translateElement = translateElement;
window.Presentation.setI18nKey = setI18nKey;
window.Presentation.applyI18n = applyI18n;
window.Presentation.bindText = bindText;
window.Presentation.refreshBoundText = refreshBoundText;
})();
