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
   - EN: Alice and Bob finished New Year's dinner at Alicia's house. They need to buy cider and bring it back before the new year starts.
   - ES: Alicia y Rober terminaron la cena de fin de año en la casa de Alicia. Deben comprar una sidra y traerla a la casa antes de que comience el nuevo año.
   - PT: Alice e o Beto terminaram o jantar de Réveillon na casa da Alice. Precisam comprar sidra e trazer de volta antes do ano novo começar.
