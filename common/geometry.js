// Pure geometry helpers. DOM-free.
// Unions positioned rectangles ("placements") and translates points between
// game coordinates and content-local coordinates.
// Dependencies: none.
(() => {
"use strict";

// placements: iterable of { x, y, width, height } where (x, y) is the center.
// base: optional { width, height } anchored at (0, 0), unioned with the box.
// Returns the content size and the game coordinate of its (0, 0) corner.
const computeBounds = (placements, base) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of placements || []) {
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") continue;
    const halfW = (p.width || 0) / 2;
    const halfH = (p.height || 0) / 2;
    minX = Math.min(minX, p.x - halfW);
    maxX = Math.max(maxX, p.x + halfW);
    minY = Math.min(minY, p.y - halfH);
    maxY = Math.max(maxY, p.y + halfH);
  }

  if (base && typeof base.width === "number" && typeof base.height === "number") {
    minX = Math.min(minX, 0);
    minY = Math.min(minY, 0);
    maxX = Math.max(maxX, base.width);
    maxY = Math.max(maxY, base.height);
  }

  if (minX === Infinity) {
    return { offsetX: 0, offsetY: 0, width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return {
    offsetX: minX,
    offsetY: minY,
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
    maxX,
    maxY,
  };
};

// Converts a point into content-local coordinates using the bounds offset.
const toLocalPoint = (point, bounds) => ({
  x: point.x - bounds.offsetX,
  y: point.y - bounds.offsetY,
});

window.Geometry = window.Geometry || {};
window.Geometry.computeBounds = computeBounds;
window.Geometry.toLocalPoint = toLocalPoint;
})();