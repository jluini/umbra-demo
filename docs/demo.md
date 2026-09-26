# The demo game

**Demo** is a minimal *umbra* game used to verify engine features. It is not a
real game — just a configuration that exercises the engine's capabilities.

## Languages

The demo supports three languages: English, Spanish and Portuguese. In this game,
the engine's *actors* are called **characters** and its *locations* are called
**places**.

Portuguese is not natively supported by the engine, so the game provides all
Portuguese translations for engine concepts. For example *mission* is shown as
**missão**.

## Actors

The characters of this game are:

1. Alice
2. Bob
3. Charles
4. Dave
5. Elena
6. Fiona
7. George

## Items

The game defines these item types: `cider`, `bike`, `chocolates`, `diamond`,
`key`, `redPotion`, `bluePotion`, `yellowPotion`, `greenPotion`, `starCoin` and
`coin`.

## Locations

The game defines the following locations. Each carries presentation geometry
under `location.map`: a center point `(x, y)` and a `width`/`height` in game
pixels, used by the `map-view` component to lay out the world. Locations with a
`pictureUrl` are drawn with an image.

| Location | map.x | map.y | map.width | map.height |
| --- | --- | --- | --- | --- |
| Alice's House | 0 | -300 | 200 | 200 |
| Bob's House | -400 | 0 | 200 | 200 |
| Charles's House | 400 | 0 | 200 | 200 |
| Market | 0 | 300 | 220 | 220 |
| Square | 0 | 0 | 260 | 260 |
| Forest | 350 | 350 | 240 | 240 |

The engine ignores `location.map`; the `map-view` component reads it through
`Geometry.computeBounds` to derive the size and offset of the map content.

## Routes

Locations are connected by the following routes (bidirectional, distances in km):

| From | To | Distance |
| --- | --- | --- |
| Alice's House | Square | 1 |
| Bob's House | Square | 1.2 |
| Charles's House | Square | 1.4 |
| Square | Market | 0.5 |

The engine computes shortest paths automatically. For example, Alice's House to
Market is 1.5 km via Square. Forest is unreachable from all other locations.

## Missions

### Mission 1: End of year toast (`test`)

Starts on December 31, 2024, at 10:00 PM; deadline at midnight. Alice and Bob are
at Alice's house. Charles is at his own house with a cider. The player must get
Alice and Bob together at Alice's house, with at least one cider and no one else
present, before midnight; if all three end up together, the mission is lost.

Actors, starting locations and starting items:

- Alice → Alice's House (coin, bike, chocolates)
- Bob → Alice's House (nothing)
- Charles → Charles's House (cider)

Mission locations: Alice's House, Charles's House, Market.

Rules:

```js
rules: [
  { effect: "victory",
    conditions: [
      { kind: "itemAt", item: "cider", at: "aliceHouse" },
      { kind: "actorsAt", actors: ["alice", "bob"], at: "aliceHouse", exact: true },
    ],
    message: "missions.test.victory" },
  { effect: "defeat",
    conditions: [
      { kind: "actorsTogether", actors: ["alice", "bob", "charles"] },
    ],
    message: "missions.test.defeat" },
]
```

### Mission 2: The Potion Contest (`test2`)

Starts on December 31, 2024, at 10:00 PM; deadline at midnight. Elena and Fiona
host a potion contest in the square. Alice and Bob promised to bring the red
potion, but George left the recipe at Bob's house. Meanwhile Charles wanders
around looking for a way to cheat.

Actors: Alice (coin, bike, chocolates), Bob (redPotion, bluePotion,
yellowPotion), Charles (diamond, greenPotion, cider, starCoin, key) — all at
their respective houses —, Dave and Elena at Charles's House, Fiona at the
Square and George at the Forest.

Mission locations: Alice's House, Bob's House, Charles's House, Square, Forest,
Market.

This mission has no `rules` yet; it is used to exercise a larger cast, more
locations and item distribution.
