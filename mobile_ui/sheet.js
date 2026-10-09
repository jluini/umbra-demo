// Sheet + inventory view: builds the actor/item/trade/means sheet HTML and the
// inventory bar. Factory receives the DOM targets, state/engine accessors and
// the formatting/translation helpers it needs (keeps it decoupled and swappable
// for variants). Dependencies: none.
(() => {
"use strict";

const create = ({ sheetBody, inventoryBar, getEngine, getState, helpers }) => {
  const { esc, itemIconHTML, actorName, locationName, itemName, meanName, meanIcon,
          t, lang, formatDuration, formatDistance, formatDateTime } = helpers;

  let lastInvActor = null;

  /* ---------- Items / inventory ---------- */

  const actorsAt = (engine, locationId) =>
    engine.getActors().filter((a) => a.activity.kind === "idle" && a.activity.at === locationId);

  const itemTileHTML = (group) => {
    const { selectedItemId } = getState();
    const name = itemName(group.item.id);
    const sel = selectedItemId === group.item.id ? " sel" : "";
    return '<button class="item-tile' + sel + '" data-action="select-item" data-item="' + group.item.id + '"' +
      ' title="' + esc(name) + '" aria-label="' + esc(name) + '">' +
      '<span class="ii">' + itemIconHTML(group.item) + "</span>" +
      (group.count > 1 ? '<span class="item-count">' + group.count + "</span>" : "") +
      "</button>";
  };

  const itemsGridHTML = (actor) => {
    const groups = getEngine().getItemGroups(actor.id);
    if (!groups.length) return '<div class="chips"><span class="chip empty">' + esc(t("ui.item.none")) + "</span></div>";
    return '<div class="items-grid">' + groups.map(itemTileHTML).join("") + "</div>";
  };

  // Inventory bar (floats below the avatars row). Shows only the item tiles; the
  // selected item is detailed in the sheet. Animates when opening or switching actor.
  const renderInventory = () => {
    const engine = getEngine();
    const state = getState();
    const a = state.selectedActorId ? engine.getActor(state.selectedActorId) : null;
    const show = !!a && state.inventoryOpen && !state.selectedLooseItem && state.sheetMode === "idle" && a.activity.kind === "idle";
    if (!show) {
      inventoryBar.hidden = true;
      inventoryBar.replaceChildren();
      lastInvActor = null;
      return;
    }
    const animate = inventoryBar.hidden || a.id !== lastInvActor;
    inventoryBar.hidden = false;
    inventoryBar.innerHTML = itemsGridHTML(a);
    lastInvActor = a.id;
    if (animate) {
      inventoryBar.querySelectorAll(".item-tile").forEach((el) => el.classList.add("bubble-in"));
    }
  };

  const itemHeaderHTML = (a, itemId) => {
    const engine = getEngine();
    const item = engine.getConfig().items[itemId] || { id: itemId };
    const name = item.stackable ? engine.getItemCount(a.id, itemId) + " " + itemName(itemId) : itemName(itemId);
    return '<div class="sheet-title"><span class="av av-head" style="--c:var(--item-color); --c-bg:var(--panel-2)">' + itemIconHTML(item) +
      "</span><h2>" + esc(name) + '</h2><span class="at">· ' + esc(actorName(a.id)) +
      '</span><span class="at">· ' + esc(locationName(a.activity.at)) + "</span></div>";
  };

  const itemActionsHTML = (a) => {
    const state = getState();
    if (state.giveMode) return givePanelHTML(a);
    const item = getEngine().getConfig().items[state.selectedItemId];
    const placeable = item && (item.carry === "optional" || item.carry === "none");
    let html = '<div class="item-actions">';
    if (placeable) html += '<button class="primary" data-action="drop">' + esc(t("ui.item.dropHere")) + "</button>";
    html += '<button class="primary" data-action="give">' + esc(t("ui.item.giveTo")) + "</button>";
    return html + "</div>";
  };

  const givePanelHTML = (a) => {
    const engine = getEngine();
    const { selectedItemId } = getState();
    const recipients = actorsAt(engine, a.activity.at).filter((x) => x.id !== a.id);
    let html = '<div class="item-detail giving"><div class="dn"><b>' +
      esc(t("ui.item.givePrefix")) + " " + esc(itemName(selectedItemId)) + esc(t("ui.item.giveSuffix")) + "</b></div>";
    if (!recipients.length) {
      html += '<div class="recip-note">' + esc(t("ui.item.noRecipients")) + "</div>";
    } else {
      html += '<div class="recip-list">' + recipients.map((r) =>
        '<button class="recip" data-action="give-to" data-actor="' + r.id + '">' +
        '<span class="av av-map" style="--c:' + r.preset.color + '"><img src="' + r.preset.avatarUrl + '" alt=""></span>' +
        '<span class="rn">' + esc(actorName(r.id)) + "</span>" +
        '<span class="rc">' + engine.getItemCount(r.id, selectedItemId) + "</span></button>").join("") + "</div>";
    }
    html += '<button class="mini-btn ghost" data-action="cancel-give">' + esc(t("plan.cancel")) + "</button></div>";
    return html;
  };

  // A loose (location) item: subject first, then its location as context.
  const looseItemHeaderHTML = (locationId, itemId) => {
    const item = getEngine().getConfig().items[itemId] || { id: itemId };
    return '<div class="sheet-title"><span class="av av-head" style="--c:var(--item-color); --c-bg:var(--panel-2)">' + itemIconHTML(item) +
      '</span><h2>' + esc(itemName(itemId)) + '</h2><span class="at">· ' +
      esc(locationName(locationId)) + "</span></div>";
  };

  const takeActionsHTML = () => {
    const state = getState();
    const item = getEngine().getConfig().items[state.selectedLooseItem.itemId];
    if (!item || item.carry === "none") {
      return '<div class="phase-sub">' + esc(t("ui.item.cannotTake")) + "</div>";
    }
    if (state.takeMode) return takePanelHTML();
    return '<div class="item-actions"><button class="primary" data-action="take">' + esc(t("ui.item.take")) + "</button></div>";
  };

  const takePanelHTML = () => {
    const engine = getEngine();
    const { locationId, itemId } = getState().selectedLooseItem;
    const takers = actorsAt(engine, locationId);
    let html = '<div class="item-detail giving"><div class="dn"><b>' +
      esc(t("ui.item.take")) + " " + esc(itemName(itemId)) + "</b></div>";
    if (!takers.length) {
      html += '<div class="recip-note">' + esc(t("ui.item.noTakers")) + "</div>";
    } else {
      html += '<div class="recip-list">' + takers.map((r) =>
        '<button class="recip" data-action="take-to" data-actor="' + r.id + '">' +
        '<span class="av av-map" style="--c:' + r.preset.color + '"><img src="' + r.preset.avatarUrl + '" alt=""></span>' +
        '<span class="rn">' + esc(actorName(r.id)) + "</span>" +
        '<span class="rc">' + engine.getItemCount(r.id, itemId) + "</span></button>").join("") + "</div>";
    }
    html += '<button class="mini-btn ghost" data-action="cancel-take">' + esc(t("plan.cancel")) + "</button></div>";
    return html;
  };

  /* ---------- Sheet ---------- */

  const actorHeaderHTML = (a) =>
    '<div class="sheet-title"><span class="av av-head" style="--c:' + a.preset.color + '">' +
    '<img src="' + a.preset.avatarUrl + '" alt=""></span><h2>' + esc(actorName(a.id)) + "</h2>" +
    '<span class="at">· ' + esc(locationName(a.activity.at)) + "</span></div>";

  const idleSheetHTML = (a) => {
    const engine = getEngine();
    if (a.activity.kind === "transit") {
      const elapsed = engine.getInternalTime() - a.activity.startedAt;
      const pct = Math.min(100, (elapsed / a.activity.duration) * 100);
      return '<div class="activity"><span>' + meanIcon(a.activity.mean) + '</span><div class="grow">' + esc(t("ui.plan.onTheWayTo")) +
        " <b>" + esc(locationName(a.activity.to)) + "</b><small>" + esc(meanName(a.activity.mean)) + " · " + elapsed + "/" + a.activity.duration +
        " min</small></div></div>" + '<div class="progress"><i style="width:' + pct + '%"></i></div>';
    }
    const plan = engine.getPlan(a.id);
    if (plan) {
      const arrival = new Date(engine.getClock().getTime() + plan.duration * 60000);
      return '<div class="activity"><span>' + meanIcon(plan.mean) + '</span><div class="grow">→ <b>' + esc(locationName(plan.destination)) +
        "</b><small>" + esc(meanName(plan.mean)) + " · " + formatDuration(plan.duration) + " · " + esc(t("ui.plan.arrives")) + " " +
        formatDateTime(arrival, lang(), "time") + "</small></div>" +
        '<button class="x" data-action="cancel-plan">✕</button></div>';
    }
    let html = '<button class="primary" data-action="move">' + esc(t("ui.plan.moveTo")) + "</button>";
    if (engine.getTrades(a.activity.at).length > 0) {
      html += '<button class="primary" data-action="open-trades">' + esc(t("ui.trade.title")) + "</button>";
    }
    return '<div class="item-actions">' + html + "</div>";
  };

  const tradeRowHTML = (a, trade) => {
    const engine = getEngine();
    const reward = trade.reward || [];
    const first = reward[0] ? engine.getConfig().items[reward[0].item] : null;
    const title = trade.label || (first ? itemName(first.id) : "");
    const extra = reward.length > 1 ? " ×" + reward.reduce((n, e) => n + e.quantity, 0) : "";
    const cost = (trade.cost || []).map((e) => e.quantity + " × " + itemName(e.item)).join(" + ");
    const ok = engine.canTrade(a.id, a.activity.at, trade.id).ok;
    const note = ok ? esc(t("ui.trade.cost")) + " " + esc(cost) : esc(t("ui.trade.missingCost"));
    return '<button class="mean-row' + (ok ? "" : " disabled") + '"' + (ok ? ' data-action="do-trade" data-trade="' + trade.id + '"' : "") + ">" +
      '<span class="mi">' + itemIconHTML(first) + "</span>" +
      '<span class="mn">' + esc(title) + extra + '<small>' + note + "</small></span></button>";
  };

  const tradeSheetHTML = (a) => {
    const engine = getEngine();
    const trades = engine.getTrades(a.activity.at);
    return '<div class="phase-bar">' +
      '<button class="icon-btn" data-action="cancel-trades">←</button>' +
      '<span class="phase-title">' + esc(t("ui.trade.title")) + " · " + esc(locationName(a.activity.at)) + "</span></div>" +
      '<div class="means-list">' + trades.map((tr) => tradeRowHTML(a, tr)).join("") + "</div>";
  };

  const reachableList = () => {
    const engine = getEngine();
    const a = engine.getActor(getState().selectedActorId);
    return engine.getMission().locations
      .filter((l) => l.id !== a.activity.at && engine.distance(a.activity.at, l.id) !== Infinity)
      .map((l) => ({ loc: l, d: engine.distance(a.activity.at, l.id) }))
      .sort((x, y) => x.d - y.d);
  };

  const destinationSheetHTML = () => {
    const { listView } = getState();
    let html = '<div class="phase-bar">' +
      '<button class="icon-btn" data-action="cancel-destination">←</button>' +
      '<span class="phase-title">' + esc(t("ui.plan.chooseDestination")) + "</span>" +
      '<span class="seg">' +
      '<button class="' + (listView ? "" : "on") + '" data-action="view-map">' + esc(t("ui.plan.viewMap")) + "</button>" +
      '<button class="' + (listView ? "on" : "") + '" data-action="view-list">' + esc(t("ui.plan.viewList")) + "</button>" +
      "</span></div>";
    if (listView) {
      html += '<div class="dest-list">' + reachableList().map((r) =>
        '<button class="dest-row" data-action="choose-dest" data-loc="' + r.loc.id + '">' +
        '<span class="dn">' + esc(locationName(r.loc.id)) + '</span><span class="dd">' +
        formatDistance(r.d) + "</span></button>").join("") + "</div>";
    } else {
      html += '<div class="phase-sub">' + esc(t("ui.plan.chooseHint")) + "</div>";
    }
    return html;
  };

  // One "to drop" line per violated capacity group: the item types actually present.
  const formatViolation = (v) => {
    const names = v.items.map((x) => itemName(x.id)).join("/");
    return (v.excess > 1 ? v.excess + " " : "") + names;
  };

  const meansSheetHTML = (a) => {
    const engine = getEngine();
    const { selectedDestId } = getState();
    const d = engine.distance(a.activity.at, selectedDestId);
    const means = engine.getAvailableMeans(a.id);
    const rows = means.map((m) => {
      const duration = engine.computeTravelTime(d, m.id);
      const arrival = new Date(engine.getClock().getTime() + duration * 60000);
      const disabled = m.blocked ? " disabled" : "";
      const action = m.blocked ? "" : ' data-action="choose-means"';
      const note = m.blocked
        ? (m.violations || []).map((v) => "<small>" + esc(t("ui.means.dropToTravel", { items: formatViolation(v) })) + "</small>").join("")
        : "";
      return '<button class="mean-row' + disabled + '"' + action + ' data-mean="' + m.id + '">' +
        '<span class="mi">' + (m.icon || "🚶") + "</span>" +
        '<span class="mn">' + esc(meanName(m.id)) + note + "</span>" +
        '<span class="mm"><b>' + formatDuration(duration) + "</b><small>" + esc(t("ui.plan.arrives")) + " " +
        formatDateTime(arrival, lang(), "time") + "</small></span></button>";
    }).join("");
    return '<div class="phase-bar">' +
      '<button class="icon-btn" data-action="back-destination">←</button>' +
      '<span class="phase-title">' + esc(t("ui.plan.goTo")) + " <b>" + esc(locationName(selectedDestId)) + "</b></span></div>" +
      '<div class="phase-sub">' + formatDistance(d) + " " + esc(t("ui.plan.tripInfo")) + "</div>" +
      '<div class="means-list">' + rows + "</div>";
  };

  const renderSheet = () => {
    const engine = getEngine();
    const state = getState();
    if (!engine) { sheetBody.replaceChildren(); return; }
    if (state.selectedLooseItem) {
      const head = looseItemHeaderHTML(state.selectedLooseItem.locationId, state.selectedLooseItem.itemId);
      const actions = state.selectedLooseItem.reservedBy
        ? '<div class="phase-sub">' + esc(t("ui.item.reservedBy")) + " " + esc(actorName(state.selectedLooseItem.reservedBy)) + "</div>"
        : takeActionsHTML();
      sheetBody.innerHTML = head + actions;
      return;
    }
    if (!state.selectedActorId) { sheetBody.replaceChildren(); return; }
    const a = engine.getActor(state.selectedActorId);
    let html;
    if (state.selectedItemId && state.sheetMode === "idle") {
      html = itemHeaderHTML(a, state.selectedItemId) + itemActionsHTML(a);
    } else {
      html = actorHeaderHTML(a);
      if (state.sheetMode === "destination") html += destinationSheetHTML();
      else if (state.sheetMode === "means") html += meansSheetHTML(a);
      else if (state.sheetMode === "trade") html += tradeSheetHTML(a);
      else html += idleSheetHTML(a);
    }
    sheetBody.innerHTML = html;
  };

  return { renderSheet, renderInventory };
};

window.MobileSheet = { create };
})();
