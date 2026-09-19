(() => {
"use strict";

const formatDateTime = (date, lang) =>
  new Intl.DateTimeFormat(lang, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

window.Presentation = window.Presentation || {};
window.Presentation.formatDateTime = formatDateTime;
})();
