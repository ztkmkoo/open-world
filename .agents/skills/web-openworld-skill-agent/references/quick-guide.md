# Web Openworld Quick Guide

## Protocol Message Examples

```json
{ "type": "hello", "name": "player-1" }
```

```json
{ "type": "input.move", "seq": 42, "dx": 1, "dy": 0, "dtMs": 50 }
```

```json
{ "type": "state.snapshot", "tick": 1200, "players": [{ "id": "p1", "x": 12.5, "y": 4.0 }] }
```

## Suggested Folder Shape

```text
server/
  src/net/
  src/game/
  src/world/
client/
  src/net/
  src/game/
  src/input/
shared/
  protocol/
```

## Work Unit Guide (Single PR)

1. Define one user-visible feature and acceptance criteria.
2. Limit touched paths up front.
3. Add/update protocol with mandatory `type`.
4. Implement server-authoritative logic first.
5. Add client intent + rendering updates second.
6. Verify no extra refactor leaked into diff.
