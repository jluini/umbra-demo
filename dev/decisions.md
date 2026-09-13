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
