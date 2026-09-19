(() => {
"use strict";

const renderRichText = (container, content, i18n, { prefix = "richtext", base = "" } = {}) => {
  container.replaceChildren();
  for (const block of content || []) {
    const el = document.createElement("div");
    el.className = prefix + "-section";

    if (block.label) {
      const label = document.createElement("span");
      label.className = prefix + "-label";
      Presentation.setI18nKey(label, Presentation.resolveKey(block.label, base), i18n);
      el.appendChild(label);
    }
    if (block.text) {
      const text = document.createElement("span");
      text.className = prefix + "-text";
      Presentation.setI18nKey(text, Presentation.resolveKey(block.text, base), i18n);
      el.appendChild(text);
    }
    if (block.entries) {
      const list = document.createElement("ul");
      list.className = prefix + "-list";
      for (const entry of block.entries) {
        const item = document.createElement("li");
        Presentation.setI18nKey(item, Presentation.resolveKey(entry, base), i18n);
        list.appendChild(item);
      }
      el.appendChild(list);
    }

    container.appendChild(el);
  }
};

window.Presentation = window.Presentation || {};
window.Presentation.renderRichText = renderRichText;
})();
