# Rockers

"Rockers" is a game built on top of the "actor" engine. Development happens in two
tracks that stay strictly separated:

- [The umbra engine](umbra.md) — a general-purpose, reusable tool with no knowledge
  of any game that runs on it.
- [The rockers game](rockers.md) — essentially a configuration that describes what
  the engine should instantiate and how.

Because of this separation, changing the contents of `rockers/` produces a different
game running on the same engine, and the engine can keep improving without being
coupled to "Rockers".
