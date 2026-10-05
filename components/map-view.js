// Map widget: reusable, engine-agnostic renderer for a "map scene"
// (locations, routes, actor tokens) drawn in screen space, with pan and
// clickable location targets.
// Dependencies:
//   common/geometry.js       (Geometry.computeBounds)
//   common/utils.js          (Utils.buildKey)
//   presentation/i18n-dom.js (Presentation.setI18nText)
//   components/avatar.js     (Components.createAvatar)
//   components/map-view.css  (map classes, loaded by the host UI)
(() => {
"use strict";

const DEFAULT_PAD = 30;
const MAX_SCALE = 2;
const TAP_THRESHOLD = 6;
const SVG_NS = "http://www.w3.org/2000/svg";

// scene = {
//   locations: [{ id, map:{x,y,width,height}, pictureUrl?, label?, badge?, state? }],
//   routes:    [{ from, to, active? }],
//   tokens:    [{ id, at, color?, avatarUrl?, initial?, title? }],
// }
// state: "current" | "reachable" | "dim" | "selected"
const createMapView = (viewport, content, options) => {
  const opts = options || {};
  const onLocationClick = opts.onLocationClick || null;
  const pad = opts.pad != null ? opts.pad : DEFAULT_PAD;

  let scene = null;
  let i18n = null;
  let layout = null;
  const pan = { x: 0, y: 0 };
  let panDrag = null;
  let suppressClick = false;

  const computeLayout = () => {
    if (!scene) return null;
    const placements = (scene.locations || []).map((l) => l.map).filter(Boolean);
    const bounds = Geometry.computeBounds(placements);
    if (!bounds.width || !bounds.height) return null;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const scale = Math.min((vw - pad * 2) / bounds.width, (vh - pad * 2) / bounds.height, MAX_SCALE);
    return {
      vw, vh, bounds, scale,
      baseX: (vw - bounds.width * scale) / 2,
      baseY: (vh - bounds.height * scale) / 2,
    };
  };

  const screenPoint = (map) => ({
    x: (map.x - layout.bounds.offsetX) * layout.scale + layout.baseX,
    y: (map.y - layout.bounds.offsetY) * layout.scale + layout.baseY,
  });

  const clampPan = () => {
    if (!layout) return;
    const extentX = layout.bounds.width * layout.scale;
    const extentY = layout.bounds.height * layout.scale;
    const lx = Math.abs(layout.vw - extentX) / 2;
    const ly = Math.abs(layout.vh - extentY) / 2;
    pan.x = Math.max(-lx, Math.min(lx, pan.x));
    pan.y = Math.max(-ly, Math.min(ly, pan.y));
  };

  const applyPan = () => {
    content.style.transform = "translate(" + pan.x + "px, " + pan.y + "px)";
  };

  const makeLabel = (loc) => {
    const el = document.createElement("span");
    el.className = "map-marker-label";
    if (loc.label != null) el.textContent = loc.label;
    else if (i18n) Presentation.setI18nText(el, Utils.buildKey("locations", loc.id, "name"), i18n);
    else el.textContent = loc.id;
    return el;
  };

  const render = (nextScene, nextI18n) => {
    scene = nextScene || { locations: [], routes: [], tokens: [] };
    if (nextI18n) i18n = nextI18n;
    layout = computeLayout();
    content.replaceChildren();
    if (!layout) return;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "map-routes");
    content.appendChild(svg);

    const markers = document.createElement("div");
    markers.className = "map-markers";
    content.appendChild(markers);

    const pos = {};
    for (const loc of scene.locations) {
      if (loc.map) pos[loc.id] = screenPoint(loc.map);
    }

    for (const r of scene.routes || []) {
      const a = pos[r.from];
      const b = pos[r.to];
      if (!a || !b) continue;
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
      line.setAttribute("class", "map-route" + (r.active ? " is-active" : ""));
      svg.appendChild(line);
    }

    const occupants = {};
    for (const loc of scene.locations) {
      if (!loc.map || !pos[loc.id]) continue;
      const p = pos[loc.id];
      const el = document.createElement("button");
      el.type = "button";
      el.className = "map-marker"
        + (loc.pictureUrl ? " has-img" : "")
        + (loc.state ? " is-" + loc.state : "")
        + (loc.state === "reachable" ? " is-selectable" : "");
      el.style.left = p.x + "px";
      el.style.top = p.y + "px";
      el.style.width = loc.map.width * layout.scale + "px";
      el.style.height = loc.map.height * layout.scale + "px";
      el.dataset.locationId = loc.id;

      if (loc.pictureUrl) {
        const img = document.createElement("img");
        img.className = "map-marker-img";
        img.src = loc.pictureUrl;
        img.alt = "";
        img.draggable = false;
        el.appendChild(img);
      }
      el.appendChild(makeLabel(loc));

      if (loc.badge != null) {
        const badge = document.createElement("span");
        badge.className = "map-marker-badge";
        badge.textContent = loc.badge;
        el.appendChild(badge);
      }

      const occ = document.createElement("span");
      occ.className = "map-occupants";
      el.appendChild(occ);
      occupants[loc.id] = occ;

      if (onLocationClick && loc.state === "reachable") {
        el.addEventListener("click", (ev) => onLocationClick(loc.id, ev));
      }
      markers.appendChild(el);
    }

    for (const t of scene.tokens || []) {
      const host = occupants[t.at];
      if (!host) continue;
      host.appendChild(Components.createAvatar({
        color: t.color,
        avatarUrl: t.avatarUrl,
        initial: t.initial,
        role: "map",
        title: t.title,
      }));
    }

    clampPan();
    applyPan();
  };

  // Pan + tap handling (no pointer capture, so marker clicks still work).
  viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    panDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, baseX: pan.x, baseY: pan.y, moved: false };
    viewport.classList.add("panning");
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!panDrag || e.pointerId !== panDrag.id) return;
    const dx = e.clientX - panDrag.x;
    const dy = e.clientY - panDrag.y;
    if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) panDrag.moved = true;
    if (!panDrag.moved) return;
    pan.x = panDrag.baseX + dx;
    pan.y = panDrag.baseY + dy;
    clampPan();
    applyPan();
    e.preventDefault();
  });
  const endPan = (e) => {
    if (!panDrag || (e && e.pointerId !== panDrag.id)) return;
    suppressClick = panDrag.moved;
    panDrag = null;
    viewport.classList.remove("panning");
  };
  viewport.addEventListener("pointerup", endPan);
  viewport.addEventListener("pointercancel", endPan);
  viewport.addEventListener("click", (e) => {
    if (suppressClick) {
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  const resizeObserver = new ResizeObserver(() => {
    if (scene) render(scene, i18n);
  });
  resizeObserver.observe(viewport);

  return { render };
};

window.Components = window.Components || {};
window.Components.createMapView = createMapView;
})();
