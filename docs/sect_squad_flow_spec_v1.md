# Sect Squad Flow Spec v1
Date: 2026-02-17
Status: Draft implemented in code

## 1) Objective
- Enforce mandatory squad assignment after sect join.
- Block squad assignment when capacity is full.
- Expose role and location path in terminal status output.

## 2) Required User Flow
1. `/choose-faction`
2. `/choose-sect`
3. `/choose-squad`
4. `/terminal`

Rules:
- If user already has `sect_id` but no `squad_id`, all flow redirects to `/choose-squad` (not `/terminal`).
- `/terminal` and `/command` require both `sect_id` and `squad_id`.

## 3) Data Contract
- `users.squad_id`:
  - FK to `sect_squads.squad_id`
  - nullable until squad selection
- `users.role_layer_key`:
  - role layer key, default `L1_MEMBER` on squad join
- `sect_squads.capacity_total`:
  - fixed default `10`
- `sect_squads.roster_count`:
  - current headcount for squad

## 4) Assignment Constraints
- Squad must belong to user's sect (`sect_id` match).
- Assignment must be atomic:
  - update `sect_squads.roster_count = roster_count + 1` only when `roster_count < capacity_total`
  - then assign `users.squad_id`
- If `roster_count >= capacity_total`, return `SQUAD_FULL`.

## 5) Terminal Status Contract
`/command 상태` must include:
- Role title:
  - resolved from `sect_role_titles` by (`users.sect_id`, `users.role_layer_key`)
- Location path:
  - `department > hall > squad`

Example:
- `직위: 청운문도`
- `위치: 연무전 > 청검당 > 청검1대`
