# The rockers game

**Rockers** is an *umbra* game where a group of friends have to complete missions
within their town.

The actors are called "rockers", as the group calls itself — "The rockers"
(or "Los rockers" in Spanish). The items are simply called "objects"
(or "objetos" in Spanish).

## Languages

The game supports three languages: English, Spanish and Portuguese. The translations
map the engine's abstract concepts to the game's vocabulary per language:

| Concept | English | Spanish | Portuguese |
| --- | --- | --- | --- |
| actors | Rockers | Rockers | Rockers |
| items | Objects | Objetos | Objetos |
| mission | — | — | Missão |
| startsAt | — | — | Começa às |
| deadline | — | — | Prazo |
| clock | — | — | Relógio |

Portuguese fills in the engine labels (`mission`, `startsAt`, `deadline`, `clock`)
because the engine does not natively support `pt`. English and Spanish use the
engine's built-in translations.

## Actors

Actors are defined by their `id` and `key`. Their names live in the translations:

| id | key | English | Spanish | Portuguese |
| --- | --- | --- | --- | --- |
| alicia | 1 | Alice | Alicia | Alice |
| bob | 2 | Bob | Rober | Beto |
| carlos | 3 | Charles | Carlos | Carlos |

## Levels

Currently there is a single test level that exposes a subset of the actors:

1. `test` — "Test" / "Prueba" / "Teste" — starts at 2024-12-31T22:00 · deadline 2025-01-01T00:00 · actors: alicia, bob
