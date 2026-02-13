# Architecture Checklist

## Core systems

- Input system separated from player controller logic
- Fixed-step simulation loop with interpolation strategy
- Chunk streaming manager with preload radius
- Entity component boundaries documented
- Event bus or message queue for cross-system communication

## Data and save

- World seed and generation config are explicit
- Delta-save format avoids full world snapshots
- Save schema versioned from day one

## Performance

- Target frame time defined by platform class
- Draw-call budget set and tracked
- Culling strategy implemented early
- Expensive debug overlays disabled in production builds

## Delivery

- Every milestone is playable
- Every milestone has regression checklist
- Core metrics logged for comparison between builds
