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

Each game lives in `games/` as a single JS file that exports a
`window.Gamename = { id, config }` object. Games are selected via the `?game=`
query parameter in `index.html` (default: `demo`); `?lang=` selects the language
and `?play=<n>` starts mission `n` directly.

Current games:

- [demo](demo.md) — a minimal test game used to verify engine features.
- rockers — not yet implemented.

## Repository structure

```
umbra/umbra.js          — engine (pure logic, no DOM)
common/                 — pure, DOM-free utilities
  utils.js              — generic helpers
  geometry.js           — placements bounding box and coordinate translation
presentation/           — shared presentation helpers and DOM bindings
  i18n.js               — translations
  i18n-dom.js           — data-i18n DOM binding
  format.js             — value formatting
  richtext.js           — rich text rendering
components/             — reusable DOM widgets
  map-view.js           — map widget (draggable viewport + markers)
  map-view.css          — map widget styles
modern_ui/              — default UI (markup, styles, controller)
basic_ui/               — older, minimal UI (stale)
games/
  demo.js               — demo game config
  demo/                 — demo assets (icons, actors, locations)
  rockers.js            — rockers game config (placeholder)
dev/                    — bundler/optimizer scripts and smoke tests
docs/
  index.md              — this file
  umbra.md              — engine spec
  demo.md               — demo game spec
  rockers.md            — rockers game spec
```
