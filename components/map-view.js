// Map widget: a clipped, draggable viewport that renders location markers.
// Dependencies:
//   common/geometry.js       (Geometry.computeBounds, Geometry.toLocalPoint)
//   common/utils.js          (Utils.buildKey)
//   presentation/i18n-dom.js (Presentation.setI18nText)
//   components/map-view.css  (map classes, loaded by the host UI)
(() => {
"use strict";

const MIN_SCALE = 0.6;

const createMapView = (viewport, content) => {
  let posX = 0;
  let posY = 0;
  let scale = 1;
  let pan = null;
  let bounds = null;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function apply() {
    content.style.transform =
      "translate(" + posX + "px, " + posY + "px) scale(" + scale + ")";
  }

  function setPos(x, y) {
    const minX = Math.min(0, viewport.clientWidth - content.offsetWidth * scale);
    const minY = Math.min(0, viewport.clientHeight - content.offsetHeight * scale);
    posX = clamp(x, minX, 0);
    posY = clamp(y, minY, 0);
    apply();
  }

  // Zooms out so the content fits the viewport width, but never below MIN_SCALE.
  function updateScale() {
    if (!content.offsetWidth) return;
    scale = clamp(viewport.clientWidth / content.offsetWidth, MIN_SCALE, 1);
    setPos(posX, posY);
  }

  const resizeObserver = new ResizeObserver(updateScale);
  resizeObserver.observe(viewport);

  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    viewport.setPointerCapture(e.pointerId);
    pan = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: posX, baseY: posY };
    viewport.classList.add("panning");
    e.preventDefault();
  }

  function onMove(e) {
    if (!pan || e.pointerId !== pan.pointerId) return;
    e.preventDefault();
    setPos(pan.baseX + (e.clientX - pan.startX), pan.baseY + (e.clientY - pan.startY));
  }

  function onUp(e) {
    if (!pan || e.pointerId !== pan.pointerId) return;
    if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
    pan = null;
    viewport.classList.remove("panning");
  }

  viewport.addEventListener("pointerdown", onDown);
  viewport.addEventListener("pointermove", onMove);
  viewport.addEventListener("pointerup", onUp);
  viewport.addEventListener("pointercancel", onUp);

  function renderMarkers(locations, i18n) {
    content.replaceChildren();
    for (const loc of locations) {
      if (!loc.map) continue;
      const point = Geometry.toLocalPoint(loc.map, bounds);

      const marker = document.createElement("div");
      marker.className = "map-marker";
      marker.style.left = point.x + "px";
      marker.style.top = point.y + "px";
      marker.dataset.locationId = loc.id;

      const rect = document.createElement("div");
      rect.className = "map-marker-rect";
      rect.style.width = loc.map.width + "px";
      rect.style.height = loc.map.height + "px";
      marker.appendChild(rect);

      if (loc.pictureUrl) {
        const img = document.createElement("img");
        img.className = "map-marker-img";
        img.src = loc.pictureUrl;
        img.alt = "";
        img.draggable = false;
        img.style.width = loc.map.width + "px";
        img.style.height = loc.map.height + "px";
        marker.appendChild(img);
      }

      const label = document.createElement("div");
      label.className = "map-marker-label";
      Presentation.setI18nText(label, Utils.buildKey("locations", loc.id, "name"), i18n);
      marker.appendChild(label);

      content.appendChild(marker);
    }
  }

  function setLocations(locations, i18n) {
    const placements = locations.map((loc) => loc.map).filter(Boolean);
    bounds = Geometry.computeBounds(placements);
    content.style.width = bounds.width + "px";
    content.style.height = bounds.height + "px";
    renderMarkers(locations, i18n);
    updateScale();
    setPos(0, 0);
  }

  return { setLocations };
};

window.Components = window.Components || {};
window.Components.createMapView = createMapView;
})();