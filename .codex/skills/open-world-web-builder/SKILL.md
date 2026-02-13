---
name: open-world-web-builder
description: Build and iterate a browser-based open-world game after stack selection. Use when creating project structure, core gameplay loop, world chunking, save/load, entity systems, performance budgets, and incremental delivery plans for a web game.
---

# Open World Web Builder

Use this skill after a stack is chosen.

## Build Order

1. Establish a thin vertical slice.
- Player movement
- Camera
- One small world zone
- Basic interaction
- HUD with FPS and chunk/entity counters

2. Implement world model.
- Split map into deterministic chunks
- Define entity schema with stable IDs
- Load/unload chunks based on player radius

3. Add persistence.
- Save only deltas from base world seed
- Version save format and add migration hook

4. Introduce content loop.
- Resource nodes
- Crafting or progression gate
- One objective chain that forces traversal

5. Enforce performance budgets.
- CPU frame budget target and draw-call target
- Profile before adding new systems
- Gate merges on performance checks

## Engineering Rules

- Keep game state deterministic where possible.
- Separate render state from simulation state.
- Keep networking optional until single-player loop is stable.
- Prefer feature flags for experimental systems.

## Deliverables for each milestone

- Playable build URL
- Known bottlenecks list
- Next two technical risks and mitigation plan

## References

- Use `references/architecture-checklist.md` while implementing foundations.
