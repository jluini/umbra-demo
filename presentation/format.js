// Presentation formatting helpers (Intl-based). DOM-free.
// Dependencies: none.
(() => {
"use strict";

// Named Intl.DateTimeFormat variants. The host picks one; the final output
// still follows the locale.
const formats = {
  datetime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
  date: { day: "2-digit", month: "2-digit", year: "numeric" },
  time: { hour: "2-digit", minute: "2-digit" },
};

const resolveOptions = (format) =>
  (typeof format === "string" ? formats[format] : format) || formats.datetime;

const formatDateTime = (date, lang, format = "datetime") =>
  new Intl.DateTimeFormat(lang, resolveOptions(format)).format(date);

const formatDistance = (km) => Math.round(km * 100) / 100 + " km";

const formatDuration = (minutes) => minutes + " min";

window.Presentation = window.Presentation || {};
window.Presentation.formats = formats;
window.Presentation.formatDateTime = formatDateTime;
window.Presentation.formatDistance = formatDistance;
window.Presentation.formatDuration = formatDuration;
})();
