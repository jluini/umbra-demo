// Presentation formatting helpers (Intl-based). DOM-free.
// Dependencies: none.
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

const formatDistance = (km) => Math.round(km * 100) / 100 + " km";

const formatDuration = (minutes) => minutes + " min";

window.Presentation = window.Presentation || {};
window.Presentation.formatDateTime = formatDateTime;
window.Presentation.formatDistance = formatDistance;
window.Presentation.formatDuration = formatDuration;
})();
