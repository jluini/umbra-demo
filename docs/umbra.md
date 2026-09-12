# The umbra engine

`umbra/` is a general-purpose engine for non-realtime, decision-based games: the
player makes choices for each actor on a turn, then the game runs and clocks advance.

The engine is built on two abstract concepts:

- **actors** — the entities that live in a game world.
- **items** — the objects with which actors interact.

The engine:

- manages one or more independent game instances, each with its own state.
- knows nothing about the DOM or about how it is rendered.
- exposes its state and changes through events; the host application connects an
  external renderer that listens to those events.
- never references any specific game.

The host (for example `index.html`) declares the view as **widgets** — markup and
CSS it owns. The renderer feeds only the widgets that are present, translating
engine events into presentation. Because the renderer is pluggable, the engine can
run with a different renderer on a different architecture without rewriting its
logic.

Because the engine supports several independent instances, more than one game can
run at a time in the same page — for example, a split screen comparing two games.

Every game built on umbra follows the same shape: its own actors, its own
levels/missions, and its own aesthetics.

A game defines its actors as a set identified by unique ids, each carrying a
`key` — a stable number that can be used, for example, to map an actor to a
hotkey. Each mission exposes a subset of the game's actors.

Each mission has a **start time** and a **deadline**: the game clock starts at the
mission's start time and advances as the player makes decisions.
Starting the engine begins at the first mission and emits events the renderer
feeds into the widgets. The engine requires at least one mission — starting with an
empty mission list is an error.

## Languages and translations

The engine includes built-in translations for its own concepts (mission, actors,
items, startsAt, deadline, clock) in a fixed set of languages (`en`, `es`, `de`).

Each game defines:

- `config.languages` — the list of languages available in that game.
- `config.translations` — a per-language object of game-specific terms that
  override the engine's defaults. Any term the game does not define falls back
  to the engine's translation. If the game chooses a language the engine does
  not have, it falls back to `en`. The game can also provide engine concept
  translations (mission, startsAt, etc.) for languages the engine does not
  support.

Mission names can be a string (same in all languages) or a per-language object
(`{ en: "Test", es: "Prueba" }`). The engine resolves the name for the current
language.

The instance tracks the current language and exposes:

- `t(key)` — returns the translation of a key in the current language.
- `setLanguage(lang)` — switches the language and emits `language:set`.
- `languages()` — returns the game's available languages.

The renderer can listen to `language:set` to re-render widgets when the language
changes.
