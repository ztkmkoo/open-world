---
name: web-openworld-skill-agent
description: Build and extend a web-based online open-world game only in very small, single-PR increments. Trigger only when the task is an implementation change for this game with explicit scope (target files/folders), constraints, and diff-oriented delivery. Do not trigger for broad architecture rewrites, multi-feature requests, unspecified scope, non-game tasks, or requests that require full-file prose output instead of patch diffs.
---

# Web Openworld Skill Agent

Implement exactly one feature per request (one PR size), with minimal and safe edits.

## Absolute Rules

1. If request exceeds scope or is ambiguous, ask exactly 3 questions and stop.
2. Allow changes only in user-specified files/folders.
3. Output must be unified diff only.
4. Keep explanation to 8 lines or fewer.
5. Do not perform large refactors or structural overhauls; make minimal changes.
6. Enforce server authority: client is untrusted; hit validation, coordinates, and state finalization are server-only.
7. Implement exactly one feature at a time (single PR scope).

## Default Stack

- Server: Node.js + TypeScript + `ws` (WebSocket)
- Client: Vite + TypeScript + Canvas 2D
- Wire format: JSON messages with mandatory discriminator: `{ "type": "..." }`

## Execution Checklist

1. Restate requested feature in one sentence.
2. Validate scope paths; if missing, ask 3 questions and stop.
3. Draft smallest viable server-authoritative flow.
4. Apply minimal code changes in allowed paths only.
5. Ensure message schema includes `type`.
6. Return unified diff only.

## Message Contract Guardrails

- Every inbound/outbound packet must include `type`.
- Reject unknown or malformed message types on server.
- Server computes and broadcasts authoritative world/player state.
- Client sends intent only (input/action request), never final state.

## Skill Use Examples

### Example 1: Connect/Move/Position Sync (MVP)

Input:
- Requirements: "Add connect, move input, and periodic position sync."
- Modify scope: `server/src/net`, `server/src/game`, `client/src/net`, `client/src/game`
- Constraints: "Server authoritative movement. Keep existing folder structure."
- Output: "Unified diff only"

### Example 2: AOI Chunk Broadcast Optimization

Input:
- Requirements: "Broadcast entity updates only to nearby chunk subscribers."
- Modify scope: `server/src/world`, `server/src/net`
- Constraints: "No protocol breakage. Single PR."
- Output: "Unified diff only"

### Example 3: Dash Skill (Server Authoritative)

Input:
- Requirements: "Add dash ability with cooldown and anti-spam checks."
- Modify scope: `server/src/game`, `client/src/input`, `shared/protocol`
- Constraints: "Server validates cooldown/distance. Client shows prediction only."
- Output: "Unified diff only"
