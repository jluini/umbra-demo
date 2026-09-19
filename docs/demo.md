# The demo game

**Demo** is a minimal *umbra* game used to verify engine features. It is not a
real game — just a configuration that exercises the engine's capabilities.

## Languages

The demo supports three languages: English, Spanish and Portuguese. In this game,
the engine's actors are called characters.

Portuguese is not natively supported by the engine, so the game provides all
Portuguese translations for engine concepts. For example *mission* is shown
as **missão**.

## Actors

The actors or characters of this game are:

1. Alice

2. Bob

3. Charles

4. Dave (unused in current mission)

## Items

The game defines one item type:

- **Cider** (`cider`) — the item actors need to acquire and bring back.

## Locations

The game defines the following locations (of which only the first two are presented in mission 1):

- Alice's House
- Bob's House
- Charles's House
- Market
- Square
- Forest

## Routes

Locations are connected by the following routes (bidirectional, distances in km):

| From | To | Distance |
| --- | --- | --- |
| Alice's House | Square | 1 |
| Bob's House | Square | 1.2 |
| Charles's House | Square | 1.4 |
| Square | Market | 0.5 |

The engine computes shortest paths automatically. For example, Alice's House to Market
is 1.5 km via Square (1 + 0.5). Forest is unreachable from all other locations.

## Missions

Currently there is a single test mission played with Alice, Bob, and Charles.

### Mission 1: Test

The mission starts on December 31, 2024, at 10:00 PM. Alice and Bob are at Alice's
house. Charles is at his own house with a cider. They have two hours to get the
cider to Alice's house before the new year begins.

Actors, starting locations, and starting items:

- Alice → Alice's House (no items)
- Bob → Alice's House (no items)
- Charles → Charles's House (cider)
