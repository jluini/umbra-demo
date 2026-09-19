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
