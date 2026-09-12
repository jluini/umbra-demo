# The umbra engine

`umbra/` is a general-purpose engine for non-realtime, decision-based games: the
player makes choices for each actor on a turn, then the game runs and clocks advance.

The engine is built on two abstract concepts:

- **actors** — the entities that live in a game world.
- **items** — the objects with which actors interact.

The engine:

- manages one or more independent game instances, each with its own state.
- renders via an event-based drawing system.
- keeps browser- and HTML-specific functionality isolated in its own
  interchangeable modules, so it can be ported to a different architecture
  without rewriting the engine logic.
- never references any specific game.

Because the engine supports several independent instances, more than one game can
run at a time in the same page — for example, a split screen comparing two games.

Every game built on umbra follows the same shape: its own actors, its own
levels/missions, and its own aesthetics.

A game defines its actors as a set identified by unique ids, each carrying a
`key` — a stable number that can be used, for example, to map an actor to a
hotkey. Each mission exposes a subset of the game's actors.
