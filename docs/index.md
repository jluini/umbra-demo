# Umbra

"Umbra" is a doc-driven project for a general-purpose, reusable game engine.
Development happens in tracks that stay strictly separated:

- [The umbra engine](umbra.md) — a general-purpose, reusable tool with no knowledge
  of any game that runs on it.
- [Games](#games) — pure configuration files that describe what the engine should
  instantiate and how.

Because of this separation, changing the contents of `games/` produces a different
game running on the same engine, and the engine can keep improving without being
coupled to any specific game.

## Games

Each game lives in `games/` as a single JS file that exports a `window.Gamename`
object with a `create()` method. Games are selected via the `?game=` query
parameter in `index.html` (default: `demo`).

Current games:

- [demo](demo.md) — a minimal test game used to verify engine features.
- rockers — not yet implemented.

## Repository structure

```
umbra/umbra.js        — engine (pure logic, no DOM)
renderer.js           — DOM adapter (pluggable)
index.html            — host page, widgets, bootstrap
games/
  demo.js             — demo game config
  rockers.js          — rockers game config (placeholder)
docs/
  index.md            — this file
  umbra.md            — engine spec
  demo.md             — demo game spec
  rockers.md          — rockers game spec
```
