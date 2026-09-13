# The umbra engine

`umbra/` is a general-purpose engine for non-realtime, decision-based games: the
player makes choices for each actor on a turn, then the game runs and clocks advance.

The engine is built on two abstract concepts:

- **actors** — the entities that live in a game world.
- **items** — the objects with which actors interact.
- **locations** — the places where actors can be or where events can happen.
  Each game defines its own locations. A level can expose a subset of the game's
  locations. Like actors, locations are defined by unique ids and carry
  per-language names.
- **routes** — the connections between locations, each with a distance. Routes
  are defined as `{ from, to, distance }` objects. They are bidirectional by
  default: `from → to` implies `to → from`. The engine pre-computes shortest
  paths using Floyd-Warshall and exposes `distance(from, to)` on the API.

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
hotkey. Each level exposes a subset of the game's actors as objects with an `id`
and a starting `location`:

Each mission has a **start time** and a **deadline**: the game clock starts at the
mission's start time and advances as the player makes decisions.
Starting the engine begins at the first mission and emits events the renderer
feeds into the widgets. The engine requires at least one mission — starting with an
empty mission list is an error.

Levels include a **briefing** — a per-language text that
introduces the mission's situation and objective. Like mission names, the
briefing can be a string (same in all languages) or a per-language object.

## Languages and translations

The engine includes built-in translations for its own concepts (mission, actors,
items, etc...) in a fixed set of languages (`en`, `es`, `de`).

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
- `distance(from, to)` — returns the shortest distance between two locations
  in km. Returns `Infinity` if no path exists. Requires `start()` to be called
  first (distances are computed at mission start).
- `computeWalkTime(distance)` — returns walking time in minutes for a given
  distance in km. Uses the engine's `WALKING_PACE` constant (10 min/km).
- `setPlan(actorId, destination)` — registers a plan for an actor to walk to a
  destination location. Emits `plan:set`.
- `cancelPlan(actorId)` — cancels an actor's plan. Emits `plan:cancel`.
- `advanceTime(minutes)` — advances the internal clock by N minutes. Emits `clock:set`.
- `play()` — starts time progression. Assigns `startTime` to all plans that don't have one yet.
- `pause()` — pauses time progression.
- `checkPlans()` — checks if any plan has completed (elapsed time >= walk time). Returns `{ actorId, plan }` for the first completed plan, or `null`.
- `completePlan(actorId)` — moves the actor to the plan's destination, removes the plan, emits `plan:done`.

Plans are stored in `state.plans` as a hash keyed by actor id:
`{ actorId: { destination, from, startTime, walkTime } }`.

- `destination` — the target location id.
- `from` — the location id where the actor was when the plan was created.
- `startTime` — `null` if the plan hasn't started yet, or the internal time (in minutes) when play began.
- `walkTime` — computed walking time in minutes from `from` to `destination`.

Time tracking uses an internal counter (`state.internalTime`) that starts at 0 when the mission begins. The displayed clock is `mission.start + internalTime`. This decouples time display from time progression.

The renderer can listen to `language:set` to re-render widgets when the language
changes.

## Widgets

The default renderer (`renderer.js`) feeds the following widgets:

- **languages** — buttons for each available language. Hidden if only one language.
- **mission** — mission name, start/deadline times, and optional briefing.
- **inventory** — initially hidden. When an actor is selected (by clicking their
  name), shows actor details and actions ("Walk to..."). In walk-to mode, shows
  available destinations with distance and walking time.
- **actors** — list of actors with their key, translated name, current location,
  and planned destination if any. Clicking an actor's name opens the inventory widget.
- **locations** — for each location in the level, a subtitle with the location name
  and a list of actors currently at that location (sorted by key).
- **clock** — current in-game time. When plans exist and the game is not playing, shows a Play button. Clicking Play starts time progression: the engine advances 1 minute every 250ms. Time stops when the first plan completes (the actor with the shortest walk time arrives at their destination). Actors in transit show their progress (elapsed/walkTime minutes). During play, the inventory widget is hidden and actors in transit cannot be selected.
