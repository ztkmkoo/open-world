---
name: web-game-stack-decider
description: Evaluate and choose the language, engine, framework, and backend shape for a browser-based open-world game. Use when requirements are still unclear, when comparing options like TypeScript + Phaser, TypeScript + Three.js/Babylon.js, or Godot Web export, and when defining a decision matrix with concrete tradeoffs, milestones, and risks.
---

# Web Game Stack Decider

Use this skill to converge quickly on a practical tech stack before implementation.

## Workflow

1. Collect constraints in one pass.
- Target device class (desktop only vs mobile support)
- Graphics target (2D top-down, 2.5D, full 3D)
- Multiplayer scope (none, async, realtime)
- Team capability (JS/TS experience, engine experience)
- Delivery timeline and tolerance for engine lock-in

2. Build a short candidate list.
- For 2D browser-first games: TypeScript + Phaser
- For 3D browser-first games: TypeScript + Three.js or Babylon.js
- For editor-heavy workflows with possible web compromises: Godot + Web export

3. Score candidates using a weighted matrix.
- Criteria: implementation speed, runtime performance, tooling productivity, ecosystem maturity, hosting complexity, and long-term maintainability
- Use 1-5 scoring and explicit weights
- Reject any option that fails a hard constraint

4. Produce a decision artifact.
- Chosen stack and one backup option
- 30/60/90 day milestones
- Top 5 risks with mitigations
- What to prototype first to de-risk assumptions

## Output Template

- Constraints summary
- Candidate matrix table
- Recommended stack
- Backup stack
- First prototype scope (1-2 weeks)
- Architecture note (client-only, client+API, or client+realtime)

## References

- Use `references/framework-matrix.md` for baseline comparisons and adjustment rules.
