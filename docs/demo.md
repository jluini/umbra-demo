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

## Locations

The game defines the following locations (of which only the first two are presented at level 1):

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

## Levels

Currently there is a single test level that is played with Alice and Bob.

### Level 1: Test

The level starts with Alice and Bob at Alice's house on December 31, 2024,
at 10:00 PM. They have two hours to get a cider before the new year begins.
