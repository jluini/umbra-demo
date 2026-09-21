// Demo SVG icon generators.
// Dependencies: none.
(() => {
"use strict";

const avatarSilhouette = (color, hair = null) => {
  const hairColor = hair && hair.color;
  const parts = [
    `<rect width="64" height="64" rx="8" fill="#1a1a2e"/>`,
    `<path d="M14 58a18 18 0 0 1 36 0z" fill="${color}"/>`,
  ];
  if (hair && hair.style === "long") {
    parts.push(`<rect x="18" y="13" width="28" height="33" rx="13" fill="${hairColor}"/>`);
  }
  parts.push(`<circle cx="32" cy="24" r="11" fill="${color}"/>`);
  if (hair) {
    parts.push(`<path d="M21 24a11 11 0 0 1 22 0z" fill="${hairColor}"/>`);
    if (hair.style === "short") {
      parts.push(`<rect x="20.4" y="21" width="2.2" height="5" rx="1.1" fill="${hairColor}"/>`);
      parts.push(`<rect x="41.4" y="21" width="2.2" height="5" rx="1.1" fill="${hairColor}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${parts.join("")}</svg>`;
};

const keyIcon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 56 52">` +
  `<circle cx="20" cy="20" r="11" fill="none" stroke="#e0a458" stroke-width="7"/>` +
  `<line x1="28" y1="28" x2="52" y2="52" stroke="#e0a458" stroke-width="7" stroke-linecap="round"/>` +
  `<line x1="43" y1="43" x2="50" y2="36" stroke="#e0a458" stroke-width="7" stroke-linecap="round"/>` +
  `<line x1="49" y1="49" x2="56" y2="42" stroke="#e0a458" stroke-width="7" stroke-linecap="round"/>` +
  `</svg>`;

const shadeColor = (hex, factor) => {
  const n = parseInt(hex.slice(1), 16);
  const parts = [16, 8, 0].map((shift) => {
    const v = Math.round(((n >> shift) & 255) * factor);
    return Math.min(255, Math.max(0, v)).toString(16).padStart(2, "0");
  });
  return "#" + parts.join("");
};

const potionIcon = (color, dark = shadeColor(color, 0.65)) => {
  const clipId = "potion-" + color.replace("#", "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="13 5 38 54">` +
    `<defs><clipPath id="${clipId}"><circle cx="32" cy="40" r="18"/></clipPath></defs>` +
    `<rect x="27" y="6" width="10" height="8" rx="2" fill="#8a5a2b"/>` +
    `<rect x="28" y="13" width="8" height="10" fill="#c9d3df"/>` +
    `<circle cx="32" cy="40" r="18" fill="#c9d3df"/>` +
    `<g clip-path="url(#${clipId})">` +
    `<path d="M14 40a18 18 0 0 0 36 0z" fill="${color}"/>` +
    `<ellipse cx="32" cy="58" rx="22" ry="12" fill="${dark}"/>` +
    `<ellipse cx="32" cy="40" rx="18" ry="3" fill="#ffffff" opacity="0.25"/>` +
    `</g>` +
    `<circle cx="25" cy="34" r="3" fill="#ffffff" opacity="0.7"/>` +
    `</svg>`;
};

const starCoinIcon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3 3 58 58">` +
  `<circle cx="32" cy="32" r="26" fill="#e0a458" stroke="#b8792e" stroke-width="4"/>` +
  `<circle cx="32" cy="32" r="18" fill="none" stroke="#f2c879" stroke-width="3"/>` +
  `<polygon points="32,19 35.23,27.55 44.36,27.98 37.23,33.70 39.64,42.52 32,37.5 24.36,42.52 26.77,33.70 19.64,27.98 28.77,27.55" fill="#8a5a2b"/>` +
  `</svg>`;

const coinIcon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="6.5 9.5 51 44.5">` +
  `<ellipse cx="32" cy="34" rx="24" ry="19" fill="#6f5420"/>` +
  `<ellipse cx="32" cy="30" rx="24" ry="19" fill="#b28f42"/>` +
  `<ellipse cx="32" cy="30" rx="24" ry="19" fill="none" stroke="#8a6a28" stroke-width="1.5"/>` +
  `<ellipse cx="32" cy="30" rx="18" ry="14" fill="none" stroke="#8a6a28" stroke-width="1" opacity="0.45"/>` +
  `<path d="M35.5 24a7 6 0 1 0 0 12" fill="none" stroke="#6f5420" stroke-width="2.2" stroke-linecap="round"/>` +
  `<line x1="32" y1="22.5" x2="32" y2="37.5" stroke="#6f5420" stroke-width="2.2" stroke-linecap="round"/>` +
  `</svg>`;

const bikeIcon = (accent = "#e94560") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 21 56 35">` +
  `<circle cx="16" cy="44" r="10" fill="none" stroke="#9aa7b8" stroke-width="3"/>` +
  `<circle cx="48" cy="44" r="10" fill="none" stroke="#9aa7b8" stroke-width="3"/>` +
  `<g fill="none" stroke="#d0d6e0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
  `<line x1="16" y1="44" x2="25" y2="28"/>` +
  `<line x1="16" y1="44" x2="30" y2="45"/>` +
  `<line x1="30" y1="45" x2="25" y2="28"/>` +
  `<line x1="25" y1="28" x2="45" y2="27"/>` +
  `<line x1="30" y1="45" x2="45" y2="27"/>` +
  `<line x1="45" y1="27" x2="48" y2="44"/>` +
  `</g>` +
  `<line x1="21" y1="27" x2="29" y2="27" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>` +
  `<line x1="44" y1="27" x2="42" y2="23" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>` +
  `<line x1="37" y1="23" x2="47" y2="23" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>` +
  `</svg>`;

window.DemoIcons = {
  avatarSilhouette,
  keyIcon,
  shadeColor,
  potionIcon,
  starCoinIcon,
  coinIcon,
  bikeIcon,
};
})();