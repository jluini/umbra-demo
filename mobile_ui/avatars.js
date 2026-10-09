// Actor roster (avatars row). Factory receives its DOM container and the
// callbacks/helpers it needs, so it stays decoupled from the controller.
// Dependencies: none.
(() => {
"use strict";

const create = ({ container, getEngine, getSelectedId, actorName, renderAvatar, onSelect }) => {
  const build = () => {
    container.replaceChildren();
    const engine = getEngine();
    if (!engine) return;
    const mission = engine.getMission();
    const actors = mission.actors.slice().sort((a, b) => a.preset.key - b.preset.key);
    for (const a of actors) {
      const name = actorName(a.id);
      const btn = document.createElement("button");
      btn.dataset.actorId = a.id;
      btn.className = "avatar-btn";
      btn.style.setProperty("--c", a.preset.color);
      btn.title = name;
      btn.appendChild(renderAvatar({ color: a.preset.color, avatarUrl: a.preset.avatarUrl, initial: name.charAt(0) }, "row"));
      const span = document.createElement("span");
      span.className = "aname";
      span.textContent = name;
      btn.appendChild(span);
      let down = null;
      btn.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" && e.button !== 0) return; down = { x: e.clientX, y: e.clientY }; });
      btn.addEventListener("pointerup", (e) => { const d = down; down = null; if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12) onSelect(a.id); });
      btn.addEventListener("pointercancel", () => { down = null; });
      btn.addEventListener("click", (e) => { if (e.detail === 0) onSelect(a.id); });
      container.appendChild(btn);
    }
    updateStates();
  };

  // Selection/status only: toggles classes on the existing buttons (no rebuild).
  const updateStates = () => {
    const engine = getEngine();
    if (!engine) return;
    const selectedId = getSelectedId();
    const sel = selectedId ? engine.getActor(selectedId) : null;
    container.querySelectorAll(".avatar-btn").forEach((btn) => {
      const a = engine.getActor(btn.dataset.actorId);
      if (!a) return;
      const far = sel && a.id !== sel.id && a.activity.at !== sel.activity.at;
      btn.classList.toggle("sel", a.id === selectedId);
      btn.classList.toggle("busy", a.activity.kind === "transit");
      btn.classList.toggle("far", !!far);
    });
  };

  return { build, updateStates };
};

window.MobileAvatars = { create };
})();
