// Mobile map module: pan/zoom viewport that renders curved routes, location
// markers (with optional picture) and occupant tokens.
// The DOM is built once per mission structure and then reconciled in place:
// state changes only toggle classes / add-remove elements, and zoom/viewport
// changes only update geometry. Nothing is ever recreated on selection/plan.
// Dependencies:
//   common/geometry.js       (Geometry.computeBounds)
//   common/utils.js          (Utils.buildKey)
//   presentation/i18n-dom.js (Presentation.setI18nText)
//   components/map-view.css  (map classes, loaded by the host UI)
(() => {
"use strict";

const WORLD_MARGIN = 300;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const TAP_THRESHOLD = 6;
const SVG_NS = "http://www.w3.org/2000/svg";

// scene = {
//   locations: [{ id, map:{x,y,width,height}, pictureUrl?, itemSide?, state?, badge? }],
//   routes:    [{ from, to, active? }],
//   tokens:    [{ id, at, color?, avatarUrl?, initial?, title? }],
//   items:     [{ key, at, itemId, avatarHtml?, icon?, title?, selected? }],
// }
// state: "current" | "reachable" | "dim" | "selected"
const createMobileMap = (viewport, options) => {
  const opts = options || {};
  const onLocationClick = opts.onLocationClick || null;
  const onTokenClick = opts.onTokenClick || null;
  const onItemClick = opts.onItemClick || null;
  const bottomInset = opts.bottomInset || (() => 0);
  const renderAvatar = opts.renderAvatar || null;

  const routesEl = document.createElementNS(SVG_NS, "svg");
  routesEl.setAttribute("class", "routes");
  routesEl.setAttribute("aria-hidden", "true");
  const markersEl = document.createElement("div");
  markersEl.setAttribute("class", "markers");
  viewport.appendChild(routesEl);
  viewport.appendChild(markersEl);

  let scene = null;
  let i18n = null;
  let layout = null;
  const pan = { x: 0, y: 0 };
  let zoom = 1;
  let panAnim = null;
  const stopAnim = () => { if (panAnim) { cancelAnimationFrame(panAnim); panAnim = null; } };

  // Reconciliation state.
  let builtSig = null;
  let layoutSig = null;
  const locEls = new Map();   // locId -> { root, img, label, badge, occ, loose }
  const routeEls = [];        // index -> <path>
  const occEls = new Map();   // actorId -> element
  const itemEls = new Map();  // item key -> element

  /* ---------- layout ---------- */

  const computeLayout = () => {
    if (!scene) return null;
    const placements = (scene.locations || []).map((l) => l.map).filter(Boolean);
    const bounds = Geometry.computeBounds(placements);
    if (!bounds.width || !bounds.height) return null;
    const minX = bounds.minX - WORLD_MARGIN;
    const maxX = bounds.maxX + WORLD_MARGIN;
    const minY = bounds.minY - WORLD_MARGIN;
    const maxY = bounds.maxY + WORLD_MARGIN;
    const cw = maxX - minX;
    const ch = maxY - minY;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const vhEff = Math.max(0, vh - bottomInset());
    const pad = 24;
    const scale = ((vh - pad * 2) / ch) * zoom;
    const W = cw * scale;
    const H = ch * scale;
    return {
      vw, vh, vhEff, scale, W, H, minX, minY,
      offsetX: (vw - W) / 2 - minX * scale,
      offsetY: (vhEff - H) / 2 - minY * scale,
    };
  };

  const toScreen = (map) => ({ x: map.x * layout.scale + layout.offsetX, y: map.y * layout.scale + layout.offsetY });

  const curveControl = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const k = 0.18;
    return { x: (a.x + b.x) / 2 - dy * k, y: (a.y + b.y) / 2 + dx * k };
  };

  /* ---------- pan / zoom ---------- */

  const clampPanValue = (x, y) => {
    if (!layout) return { x, y };
    const lx = Math.max(0, (layout.W - layout.vw) / 2);
    const ly = Math.max(0, (layout.H - layout.vhEff) / 2);
    return { x: Math.max(-lx, Math.min(lx, x)), y: Math.max(-ly, Math.min(ly, y)) };
  };
  const clampPan = () => {
    const c = clampPanValue(pan.x, pan.y);
    pan.x = c.x;
    pan.y = c.y;
  };
  const applyPan = () => {
    viewport.style.setProperty("--pan-x", pan.x + "px");
    viewport.style.setProperty("--pan-y", pan.y + "px");
  };

  const setZoom = (z, anchor) => {
    z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    if (anchor && layout) {
      const wx = (anchor.x - pan.x - layout.offsetX) / layout.scale;
      const wy = (anchor.y - pan.y - layout.offsetY) / layout.scale;
      zoom = z;
      layout = computeLayout();
      pan.x = anchor.x - (wx * layout.scale + layout.offsetX);
      pan.y = anchor.y - (wy * layout.scale + layout.offsetY);
    } else {
      zoom = z;
    }
    render();
  };

  const focusLocation = (locationId) => {
    if (!layout || !locationId) return;
    const loc = (scene.locations || []).find((l) => l.id === locationId);
    if (!loc || !loc.map) return;
    const targetX = layout.vw / 2 - (loc.map.x * layout.scale + layout.offsetX);
    const targetY = layout.vhEff / 2 - (loc.map.y * layout.scale + layout.offsetY);
    const target = clampPanValue(targetX, targetY);
    const from = { x: pan.x, y: pan.y };
    if (Math.abs(target.x - from.x) < 0.5 && Math.abs(target.y - from.y) < 0.5) return;
    stopAnim();
    const start = performance.now();
    const dur = 1100;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);              // easeOutCubic
      // const e = 1 - (1 - t) * (1 - t);            // easeOutQuad
      // const e = Math.sin(t * Math.PI / 2);        // easeOutSine
      // const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
      pan.x = from.x + (target.x - from.x) * e;
      pan.y = from.y + (target.y - from.y) * e;
      applyPan();
      panAnim = t < 1 ? requestAnimationFrame(step) : null;
    };
    panAnim = requestAnimationFrame(step);
  };

  /* ---------- reconciliation ---------- */

  const structuralSig = () => {
    const lang = i18n ? i18n.language() : "";
    const locs = (scene.locations || []).map((l) => l.id + "|" + (l.pictureUrl || "")).join(",");
    const routes = (scene.routes || []).map((r) => r.from + ">" + r.to).join(",");
    return lang + "::" + locs + "::" + routes;
  };

  const geometrySig = () =>
    layout ? [layout.vw, layout.vh, Math.round(layout.vhEff), layout.scale, Math.round(layout.offsetX), Math.round(layout.offsetY)].join("|") : "";

  const buildStructure = () => {
    routesEl.replaceChildren();
    markersEl.replaceChildren();
    routeEls.length = 0;
    locEls.clear();
    occEls.clear();
    itemEls.clear();

    for (const r of scene.routes || []) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "route");
      routesEl.appendChild(path);
      routeEls.push(path);
    }

    for (const loc of scene.locations) {
      if (!loc.map) continue;
      const root = document.createElement("button");
      root.type = "button";
      root.className = "marker" + (loc.pictureUrl ? " has-img" : "");
      root.dataset.locationId = loc.id;

      let img = null;
      if (loc.pictureUrl) {
        img = document.createElement("img");
        img.className = "marker-img";
        img.src = loc.pictureUrl;
        img.alt = "";
        img.draggable = false;
        root.appendChild(img);
      }

      const label = document.createElement("span");
      label.className = "marker-label";
      if (i18n) Presentation.setI18nText(label, Utils.buildKey("locations", loc.id, "name"), i18n);
      else label.textContent = loc.id;
      root.appendChild(label);

      const badge = document.createElement("span");
      badge.className = "dist-badge";
      badge.hidden = true;
      root.appendChild(badge);

      const occ = document.createElement("div");
      occ.className = "occupants";
      root.appendChild(occ);

      const loose = document.createElement("div");
      loose.className = "loose-items side-" + (loc.itemSide === "right" ? "right" : "left");
      root.appendChild(loose);

      // A single handler; only acts while the marker is selectable (Fase A).
      if (onLocationClick) {
        root.addEventListener("click", (ev) => {
          if (root.classList.contains("is-selectable")) onLocationClick(loc.id, ev);
        });
      }

      markersEl.appendChild(root);
      locEls.set(loc.id, { root, img, label, badge, occ, loose });
    }
  };

  const applyGeometry = () => {
    const pos = {};
    for (const loc of scene.locations) {
      if (!loc.map) continue;
      const p = toScreen(loc.map);
      pos[loc.id] = p;
      const el = locEls.get(loc.id);
      if (!el) continue;
      el.root.style.left = p.x + "px";
      el.root.style.top = p.y + "px";
      el.root.style.width = loc.map.width * layout.scale + "px";
      el.root.style.height = loc.map.height * layout.scale + "px";
    }
    (scene.routes || []).forEach((r, i) => {
      const pathEl = routeEls[i];
      if (!pathEl) return;
      const a = pos[r.from];
      const b = pos[r.to];
      if (!a || !b) { pathEl.setAttribute("d", ""); return; }
      const c = curveControl(a, b);
      pathEl.setAttribute("d", "M " + a.x + " " + a.y + " Q " + c.x + " " + c.y + " " + b.x + " " + b.y);
    });
  };

  const reconcileOccupants = () => {
    const desired = new Map();
    for (const tok of scene.tokens || []) desired.set(tok.id, tok);
    for (const [id, el] of [...occEls]) {
      if (!desired.has(id)) { el.remove(); occEls.delete(id); }
    }
    for (const [id, tok] of desired) {
      const host = locEls.get(tok.at);
      if (!host) continue;
      let el = occEls.get(id);
      if (!el) {
        if (!renderAvatar) continue;
        el = renderAvatar(tok, "map");
        el.classList.add("occupant");
        el.dataset.actorId = id;
        if (onTokenClick) el.addEventListener("click", (ev) => { ev.stopPropagation(); onTokenClick(tok.id, ev); });
        occEls.set(id, el);
      }
      if (el.parentNode !== host.occ) host.occ.appendChild(el);
    }
  };

  const reconcileItems = () => {
    const desired = new Map();
    for (const it of scene.items || []) desired.set(it.key, it);
    for (const [key, el] of [...itemEls]) {
      if (!desired.has(key)) { el.remove(); itemEls.delete(key); }
    }
    for (const [key, it] of desired) {
      const host = locEls.get(it.at);
      if (!host) continue;
      let el = itemEls.get(key);
      // Rebuild if missing or if the index now holds a different item, so the
      // reused node never shows stale content nor a stale click target.
      if (el && el.__itemId !== it.itemId) { el.remove(); itemEls.delete(key); el = null; }
      if (!el) {
        if (!renderAvatar) continue;
        el = renderAvatar(it, "item");
        el.classList.add("loose-item");
        el.__itemId = it.itemId;
        if (onItemClick) el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const cur = el.__item;
          if (cur) onItemClick(cur.at, cur.itemId, cur.key, cur.reservedBy || null, ev);
        });
        itemEls.set(key, el);
      }
      el.__item = it;
      el.classList.toggle("sel", !!it.selected);
      el.classList.toggle("reserved", !!it.reserved);
      if (el.parentNode !== host.loose) host.loose.appendChild(el);
    }
  };

  const applyState = () => {
    for (const loc of scene.locations) {
      const el = locEls.get(loc.id);
      if (!el) continue;
      const root = el.root;
      root.classList.toggle("is-current", loc.state === "current");
      root.classList.toggle("is-reachable", loc.state === "reachable");
      root.classList.toggle("is-dim", loc.state === "dim");
      root.classList.toggle("is-selected", loc.state === "selected");
      root.classList.toggle("is-selectable", loc.state === "reachable");
      if (loc.badge != null) { el.badge.textContent = loc.badge; el.badge.hidden = false; }
      else { el.badge.hidden = true; }
      el.loose.classList.toggle("side-right", loc.itemSide === "right");
      el.loose.classList.toggle("side-left", loc.itemSide !== "right");
    }
    (scene.routes || []).forEach((r, i) => {
      const pathEl = routeEls[i];
      if (pathEl) pathEl.classList.toggle("active", !!r.active);
    });
    reconcileOccupants();
    reconcileItems();
  };

  const render = (nextScene, nextI18n) => {
    if (nextScene) scene = nextScene;
    if (!scene) scene = { locations: [], routes: [], tokens: [], items: [] };
    if (nextI18n) i18n = nextI18n;

    const sig = structuralSig();
    if (sig !== builtSig) { buildStructure(); builtSig = sig; layoutSig = null; }

    layout = computeLayout();
    if (!layout) { applyPan(); return; }

    const geo = geometrySig();
    if (geo !== layoutSig) { applyGeometry(); layoutSig = geo; }

    applyState();
    clampPan();
    applyPan();
  };

  /* ---------- gestures ---------- */

  const pointers = new Map();
  let panDrag = null;
  let pinch = null;
  let suppressClick = false;

  const localPoint = (pt) => {
    const r = viewport.getBoundingClientRect();
    return { x: pt.x - r.left, y: pt.y - r.top };
  };
  const fingerDistance = () => {
    const pts = [...pointers.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
  };
  const fingerMid = () => {
    const pts = [...pointers.values()];
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  };

  viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopAnim();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      suppressClick = false;
      panDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, baseX: pan.x, baseY: pan.y, moved: false };
    } else if (pointers.size === 2) {
      panDrag = null;
      suppressClick = true;
      pinch = { dist0: fingerDistance(), zoom0: zoom };
    }
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2 && pinch) {
      setZoom(pinch.zoom0 * (fingerDistance() / pinch.dist0), localPoint(fingerMid()));
      e.preventDefault();
      return;
    }
    if (panDrag && e.pointerId === panDrag.id) {
      const dx = e.clientX - panDrag.x;
      const dy = e.clientY - panDrag.y;
      if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) panDrag.moved = true;
      if (!panDrag.moved) return;
      pan.x = panDrag.baseX + dx;
      pan.y = panDrag.baseY + dy;
      clampPan();
      applyPan();
      e.preventDefault();
    }
  });

  const onPointerEnd = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (panDrag && e.pointerId === panDrag.id) {
      suppressClick = panDrag.moved || suppressClick;
      panDrag = null;
    }
    if (pointers.size === 1 && !panDrag) {
      const [id, p] = [...pointers.entries()][0];
      panDrag = { id, x: p.x, y: p.y, baseX: pan.x, baseY: pan.y, moved: true };
    }
  };
  viewport.addEventListener("pointerup", onPointerEnd);
  viewport.addEventListener("pointercancel", onPointerEnd);
  viewport.addEventListener("click", (e) => {
    if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); }
  }, true);

  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), localPoint({ x: e.clientX, y: e.clientY }));
  }, { passive: false });

  const resizeObserver = new ResizeObserver(() => { if (scene) render(scene, i18n); });
  resizeObserver.observe(viewport);

  const layoutChanged = () => { if (scene) render(scene, i18n); };

  return { render, focusLocation, setZoom, layoutChanged };
};

window.MobileMap = { create: createMobileMap };
})();
