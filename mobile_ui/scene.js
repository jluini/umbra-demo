// Builds the map scene (locations/routes/tokens/items) for MobileMap from the
// engine + current UI selection state. Pure (no DOM): receives a context.
// Dependencies: none.
(() => {
"use strict";

const shortestPath = (engine, from, to) => {
  if (from === to) return [from];
  const adj = {};
  for (const r of engine.getConfig().routes || []) {
    (adj[r.from] = adj[r.from] || []).push(r.to);
    (adj[r.to] = adj[r.to] || []).push(r.from);
  }
  const prev = {};
  const seen = { [from]: true };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of adj[cur] || []) {
      if (seen[n]) continue;
      seen[n] = true;
      prev[n] = cur;
      if (n === to) {
        const path = [to];
        let p = to;
        while (prev[p] !== undefined) { p = prev[p]; path.unshift(p); }
        return path;
      }
      queue.push(n);
    }
  }
  return [];
};

const build = ({ engine, selectedActorId, sheetMode, selectedLooseItem, actorName, itemName, itemIconHTML, formatDistance }) => {
  const mission = engine.getMission();
  const config = engine.getConfig();
  const inMission = new Set(mission.locations.map((l) => l.id));
  const actor = selectedActorId ? engine.getActor(selectedActorId) : null;
  const selecting = sheetMode === "destination" && actor && actor.activity.kind === "idle";

  const locations = mission.locations.map((l) => {
    const entry = { id: l.id, map: l.map, pictureUrl: l.pictureUrl, itemSide: l.itemSide };
    if (selecting) {
      if (l.id === actor.activity.at) entry.state = "current";
      else {
        const d = engine.distance(actor.activity.at, l.id);
        if (d !== Infinity) { entry.state = "reachable"; entry.badge = formatDistance(d); }
        else entry.state = "dim";
      }
    }
    return entry;
  });

  const activeEdges = new Set();
  if (actor) {
    const plan = engine.getPlan(actor.id);
    const dest = plan ? plan.destination : (actor.activity.kind === "transit" ? actor.activity.to : null);
    if (dest) {
      const path = shortestPath(engine, actor.activity.at, dest);
      for (let i = 0; i < path.length - 1; i++) {
        activeEdges.add(path[i] + "|" + path[i + 1]);
        activeEdges.add(path[i + 1] + "|" + path[i]);
      }
    }
  }
  const routes = (config.routes || [])
    .filter((r) => inMission.has(r.from) && inMission.has(r.to))
    .map((r) => ({ from: r.from, to: r.to, active: activeEdges.has(r.from + "|" + r.to) }));

  const tokens = engine.getActors()
    .filter((a) => a.activity.kind === "idle")
    .map((a) => ({
      id: a.id,
      at: a.activity.at,
      color: a.preset.color,
      avatarUrl: a.preset.avatarUrl,
      initial: actorName(a.id).charAt(0),
      title: actorName(a.id),
    }));

  const items = [];
  for (const l of mission.locations) {
    (l.items || []).forEach((item, n) => {
      const key = l.id + ":" + n;
      items.push({
        key,
        at: l.id,
        itemId: item.id,
        avatarHtml: itemIconHTML(item),
        title: itemName(item.id),
        selected: !!selectedLooseItem && selectedLooseItem.key === key,
      });
    });
    (l.reserved || []).forEach((r, n) => {
      const key = l.id + ":r" + n;
      items.push({
        key,
        at: l.id,
        itemId: r.item.id,
        avatarHtml: itemIconHTML(r.item),
        title: actorName(r.actorId),
        reserved: true,
        reservedBy: r.actorId,
        selected: !!selectedLooseItem && selectedLooseItem.key === key,
      });
    });
  }

  return { locations, routes, tokens, items };
};

window.MobileScene = { build, shortestPath };
})();
