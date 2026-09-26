# The umbra engine

`umbra/umbra.js` is a general-purpose, DOM-free engine for non-realtime,
decision-based games: the player makes choices for each actor on a turn, then the
game runs and the clock advances.

## Concepts

- **actors** — the entities that live in a game world. A game defines them in
  `config.actors` as a hash keyed by id; each carries a `key` (a stable number,
  used e.g. for hotkeys) and may carry presentation fields. A mission exposes a
  subset of the game's actors, each with a starting `location` and optional
  starting `items`.
- **items** — the objects actors can possess, defined in `config.items` keyed by
  id.
- **locations** — the places where actors can be or events can happen, defined in
  `config.locations`. A mission exposes a subset. Locations may carry extra
  presentation fields (for example `map` geometry or `pictureUrl`); the engine
  passes them through untouched and never interprets them.
- **routes** — the connections between locations, defined as
  `{ from, to, distance }`. They are bidirectional: `from → to` implies
  `to → from`. The engine pre-computes shortest paths using Floyd-Warshall and
  exposes `distance(from, to)` on the API.

The engine:

- manages independent instances, each with its own state.
- knows nothing about the DOM or about how it is rendered.
- exposes its state and changes through events; a host connects an external
  renderer that listens to those events.
- never references a specific game.

Because it supports several independent instances, more than one game can run at
a time in the same page — for example, a split screen comparing two games.

## Games and missions

A game is a plain config object: `window.<Game> = { id, config }`. It defines
`languages`, `translations`, `items`, `actors`, `locations`, `routes` and
`missions`. See `games/demo.js` for a working example.

`Umbra.create(config)` builds an instance. `start(index)` starts a mission
(default index 0) and emits `mission:start` + `clock:set`. Starting with an empty
mission list or no locations is an error.

Each mission defines:

- `id`, `start` and `deadline` (date strings).
- `actors` — a subset of the game's actors with a starting `location` and
  optional starting `items` (item ids).
- `locations` — the subset of the game's locations the mission exposes.
- `rules` — optional ending conditions (see [Rules](#rules-endings)).
- `briefing` — rich-text blocks for the mission screen.

Each mission also has a **start time** and a **deadline**: the game clock starts
at the mission's start time and advances as the player makes decisions.

## Time and turns

- The player registers plans with `setPlan(actorId, destination)`. A plan is
  `{ destination, duration }`, stored in `state.plans` keyed by actor id.
- `advance()` advances exactly one minute and processes that step. It first
  commits any pending plans, then (if there is an activity in progress) updates
  the clock (`clock:set`), moves actors whose plan completed to their destination
  (`plans:completed`), checks the deadline and evaluates rules. It is a no-op
  unless the mission is running and there is something to advance. It returns
  `{ completed, ended }`.
- Committing a plan turns it into a transit activity holding `from`, `to`,
  `startedAt` and `duration`, and emits `plans:started`. Committing is internal to
  `advance()`; the public method is disabled for now.
- `canAdvance()` reports whether there is work to advance (pending plans or
  activities in progress). Hosts use it to enable their run control.
- The host decides wall-clock pacing (the modern UI advances one minute every
  250ms); the engine decides how much time passes and which plans complete.
- `stop()` tears the mission down and emits `mission:reset`.

Time is tracked by an internal minute counter (`state.internalTime`) that starts
at 0 when the mission begins; the displayed clock is `mission.start +
internalTime`. This decouples time display from time progression.

## Rules (endings)

A mission can define `rules`: a list of `{ effect, conditions, message? }`.

- `effect` is `"victory"` or `"defeat"`.
- `conditions` is a non-empty list combined with AND. Multiple rules of the same
  effect are combined with OR (in config order).
- `message` is an optional i18n key, shown by the host when the rule fires.

Condition kinds (an actor is considered "present" when its `activity.at` is
defined, so actors in transit are excluded):

- `{ kind: "itemAt", item, at }` — some actor at `at` holds `item`.
- `{ kind: "actorsAt", actors, at, exact? }` — all listed actors are at `at`;
  with `exact`, no other actor is there.
- `{ kind: "actorsTogether", actors }` — all listed actors share the same
  location.

Rules are evaluated only when a plan completes, in effect order **defeat before
victory** (and config order within an effect). The deadline is checked on every
`advance()` and is an implicit defeat (`messages.defeat.deadline`) with priority
over rules.

When a rule or the deadline fires, the engine sets `status = "ended"`, stores the
ending and emits `mission:end` with `{ effect, message, reason }`.
`getEnding()` returns it. Rules referencing unknown effects, kinds, actors, items
or locations throw at `start()`.

## State and API

Status: `ready` → `running` → `ended`; `stop()` returns to `ready`.

Getters:

- `getStatus()`, `getEnding()`, `getConfig()`, `getMission()`, `getClock()`,
  `getInternalTime()`.
- `getActors()`, `getActor(id)`, `getPlans()`, `getPlan(actorId)`,
  `getInventory(actorId)`.

Actions:

- `setPlan(actorId, destination)` — emits `plan:set`.
- `cancelPlan(actorId)` — emits `plan:cancel`.
- `giveItem(fromActorId, toActorId, item)` — transfers an item between two idle
  actors at the same location; emits `item:give`.
- `advance()` / `canAdvance()`.
- `start(missionIndex)` / `stop()`.

Helpers: `distance(from, to)` (km, `Infinity` if no path) and
`computeWalkTime(distance)` (minutes, `WALKING_PACE` = 10 min/km).

Events, via `on(name, fn)` and `emit`: `mission:start`, `clock:set`, `plan:set`,
`plan:cancel`, `item:give`, `plans:started`, `plans:completed`, `mission:end`
(payload `{ effect, message, reason }`) and `mission:reset`.

Actors hold their items in `actor.items` as arrays of item objects. Items do not
consume time.

## Languages and translations

The engine ships `Umbra.baseTranslations` for its own concepts in `en`, `es` and
`de` (for example `umbra.mission` or `messages.defeat.deadline`). The engine does
not track the current language nor render text itself.

The presentation layer (`presentation/i18n.js`) merges dictionaries per language
in order: engine base → UI → game, and resolves keys with `t(key)`, returning the
key itself when missing. A game defines `config.languages` and
`config.translations` keyed by entity id, for example
`translations.es.actors.alice.name`, `translations.es.locations.market.name` or
`translations.es.missions.test.victory`.

## Hosts / UIs

The engine has no built-in renderer. Hosts declare their own widgets and translate
engine events into presentation, decide the real-time pacing and own all DOM. Two
hosts live in this repo:

- `modern_ui/` — the default UI (map, panels, briefing, result overlay).
- `basic_ui/` — an older, minimal widget host kept for reference (stale).
