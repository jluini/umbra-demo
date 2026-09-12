# The actor engine

`actor/` is a general-purpose game engine built on two abstract concepts:

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
