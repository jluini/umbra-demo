# Development decisions

Living record of architectural decisions. Each entry documents the context, the alternatives considered, and the alternative currently selected (with reasons). Entries are updated when a decision changes; this is not a historical log.

---

## Predictor vs incremental time progression

**Context**: Play mode advances time 1 min per tick via `setInterval`, checking each tick if any plan completed.

**Alternatives**:
- (A) Incremental: advance 1 min per tick, check completion each tick.
- (B) Predictive: compute on Play press which plans complete first and their remaining times, then animate to the known final state.

**Selected**: (A) incremental. It is simple, works correctly, and today the only action type is walking (linear, predictable).

**Notes**: (B) becomes more valuable with multiple action types or dynamic events that can invalidate a precomputed plan mid-execution.

---

## Missing translation key fallback

**Context**: The presentation `i18n` resolves a term in the current language from a dictionary that merges the game's translations over Umbra's base translations. A key may be missing in the current language (the game lists a language Umbra does not support, or the game overrides only some engine terms).

**Alternatives**:
- (A) Return the key itself (e.g. `umbra.mission`).
- (B) Fall back to the base `en` translations.
- (C) Fall back to the first language available in the game.

**Selected**: (A) return the key. It makes missing translations obvious during development and never mixes languages silently.

**Notes**: (B) is reasonable once the UI is shown to players, but requires keeping the base `en` dictionary even when the game does not list `en`; (C) risks displaying a language the player did not choose.

---

## Localized text: binding vs centralized translations

**Context**: Some text depends on the current language and must update when the language changes: entity names (actors, items, locations, missions) and formatted values (the clock). Static UI labels already use `data-i18n` with keys.

**Alternatives**:
- (A) Explicit re-render: keep the value in UI state and re-run its render function on `language:set`.
- (B) Reactive value binding (`bindText`): bind an element to a per-language value or a function of `i18n`; a module registry refreshes bound elements on `language:set`.
- (C) Centralized entity text: store names in `config.translations` under `<type>.<id>.<field>` and mark elements with `data-i18n` keys; no `resolveName`, no binding.

**Selected**: (C) for entity text, with (A) for formatted values (the clock). One keyed mechanism for entity text; the UI stays reactive; no `resolveName` nor binding.

**Notes**: (B) was implemented for entity names and the clock, then replaced. It is set aside, not discarded: it is the natural option if many computed/language-dependent texts appear that keys cannot express (e.g. interpolations, composed strings).

---

## Recursive translation interpolation (possible feature)

**Context**: Translation values can repeat entity names (e.g. the demo briefing hardcodes "Alice", "Bob", "Alice's house"). A value could instead reference other keys — `{actors.alice.name} and {actors.bob.name} finished dinner at {actors.alice.name}'s house.` — and be resolved recursively.

**Alternatives**:
- (A) Parameterized `t(key, params)`: explicit, no cross-key dependencies, but the caller must pass the values.
- (B) Self-referential values with `{key}` placeholders: self-contained, convenient for config-driven static text.
- (C) Structured inline refs in rich text (`{ ref: "actors.alice.name" }`): typed, but more verbose.

**Selected**: not implemented for now; noted as a possible feature. If done, use (B) with **precomputed** resolution: resolve once per language after the base+game merge, leave unresolved placeholders as-is, and reserve `{{`/`}}` for literal braces.

**Notes**: Deferred until there is enough prose/name reuse to justify it. It does not solve grammar/plurals (gender, number, declension) — only name reuse.
