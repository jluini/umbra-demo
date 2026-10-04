// Reusable entity avatar element (actor/token). Engine-agnostic.
// Dependencies: none (components/avatar.css provides the styling).
(() => {
"use strict";

// options: { color, avatarUrl, initial, role, title }
//   role -> CSS class "avatar--<role>" used for sizing (e.g. "map", "transit", "dock").
const createAvatar = (options) => {
  const opts = options || {};
  const el = document.createElement("span");
  el.className = "avatar" + (opts.role ? " avatar--" + opts.role : "");
  if (opts.color) el.style.setProperty("--avatar-color", opts.color);
  if (opts.avatarUrl) {
    const img = document.createElement("img");
    img.src = opts.avatarUrl;
    img.alt = "";
    img.draggable = false;
    el.appendChild(img);
  } else {
    el.textContent = opts.initial != null ? opts.initial : "";
  }
  if (opts.title) {
    el.title = opts.title;
    el.setAttribute("aria-label", opts.title);
  }
  return el;
};

window.Components = window.Components || {};
window.Components.createAvatar = createAvatar;
})();
