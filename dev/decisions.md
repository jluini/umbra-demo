# Development decisions

Architectural and process decisions made during development. Each entry records context, alternatives considered, and the final decision.

Format:

```
## [YYYY-MM-DD] Title

**Context**: ...
**Alternatives**: ...
**Decision**: ...
**Status**: implemented / pending / discarded
```

---

## 2026-09-13 Predictor vs incremental time progression

**Context**: Play mode advances time 1 min per tick via `setInterval`, checking each tick if any plan completed.

**Alternatives**:
- (A) Incremental: advance 1 min per tick, check completion each tick.
- (B) Predictive: compute on Play press which plans complete first and their remaining times, then animate to the known final state.

**Decision**: Incremental for now. It is simple, works correctly, and today the only action type is walking (linear, predictable). The predictive approach becomes more valuable when there are multiple action types or dynamic events that can invalidate a precomputed plan mid-execution.

**Status**: implemented (incremental). Reconsider when adding non-walking actions or dynamic event systems.

---

## 2026-09-19 Missing translation key fallback

**Context**: The presentation `i18n` resolves a term in the current language from a dictionary that merges the game's translations over Umbra's base translations. A key may still be missing in the current language (for example, the game lists a language Umbra does not support, or the game overrides only some engine terms).

**Alternatives**:
- (A) Return the key itself (e.g. `umbra.mission`).
- (B) Fall back to the base `en` translations.
- (C) Fall back to the first language available in the game.

**Decision**: (A) for now: return the key. It makes missing translations obvious during development and never mixes languages silently. (B) is reasonable once the UI is shown to players, but requires keeping the base `en` dictionary even when the game does not list `en`; (C) risks displaying a language the player did not choose.

**Status**: implemented (A). Reconsider when shipping a game.

---

## 2026-09-19 Reactive text binding vs explicit re-render

**Context**: Some text depends on the current language and must update when the language changes. Static UI labels are handled with `data-i18n` (keyed). Dynamic values — entity names co-located in the game config, and the formatted clock — need a path that does not require a game-specific key convention.

**Alternatives**:
- (A) Explicit re-render: keep the current mission/clock in UI state and re-run their render function on `language:set`.
- (B) Reactive value binding (`bindText`): bind an element to a per-language value or a function of `i18n`; a module registry (`Set` + `WeakMap`) refreshes all bound elements on `language:set`.
- (C) Centralize entity text in the translation dictionary and mark elements with `data-i18n` keys, dropping `resolveName`; requires a game-specific key scheme and gives up co-location.

**Decision**: (B) for now. It preserves co-location (names stay on the entities), avoids leaking a game-specific key convention into the presentation layer, and updates text in place without re-rendering the board or losing UI state. (A) is simpler and was the minimal alternative; it becomes preferable if the number of language-dependent dynamic elements stays small. (C) is rejected for now to keep game configs self-contained.

**Status**: implemented (B). Caveat: `bindText` is somewhat implicit — elements "remember" a value/function in a module registry. If it becomes hard to reason about, fall back to (A) explicit re-render.
