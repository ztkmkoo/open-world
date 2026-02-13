# Framework Matrix

## Baseline candidates

1. TypeScript + Phaser
- Strengths: Fast 2D development, simple deployment, large examples pool.
- Weaknesses: Not ideal for full 3D worlds.
- Choose when: 2D gameplay and fast iteration are top priority.

2. TypeScript + Three.js
- Strengths: Flexible rendering stack, large ecosystem.
- Weaknesses: More custom architecture work.
- Choose when: Custom 3D pipeline and full control matter.

3. TypeScript + Babylon.js
- Strengths: Strong 3D game-oriented features out of the box.
- Weaknesses: Smaller community than Three.js.
- Choose when: 3D game features and faster 3D bootstrap are needed.

4. Godot (Web export)
- Strengths: Powerful editor and scene workflow.
- Weaknesses: Web export limits and larger payload concerns.
- Choose when: Team productivity in Godot outweighs browser-first constraints.

## Weight adjustment hints

- If mobile web is required, increase performance and payload weights.
- If timeline is under 8 weeks, increase implementation-speed weight.
- If realtime multiplayer is required, increase hosting-complexity weight.
