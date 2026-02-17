# Training Spec v2 (Inner Art + Skill Focus)
Date: 2026-02-17
Status: Draft for implementation

## 1) Common Rules
- Training is processed by client-driven 10-minute ticks.
- A user can train only one focus at a time.
- Training focus can be either:
  - `INNER_ART` (inner-art method)
  - `SKILL` (martial skill)
- When focus is `INNER_ART`, each tick:
  - increases inner-art mastery points
  - increases configured meridian points based on inner-art growth map (single or multiple meridians)
- UI exposes star tiers (`1~10`) and does not expose raw internal points.
- Star progression:
  - `1~4`: deterministic accumulation (no probability)
  - `5+`: accumulation + breakthrough probability and failure penalty (stability impact)

## 2) Command Grammar (Terminal)
- `수련 심법 <inner_art_name>`
  - Example: `수련 심법 무형심법`
  - Server resolves the name to an `inner_art_id` and sets `training_mode=INNER_ART`.
- `수련 무공 <skill_name>`
  - Example: `수련 무공 파천검식`
  - Server resolves the name to a `skill_id` and sets `training_mode=SKILL`.
- `수련 중지`
  - Sets `training_mode=NONE` and clears the active target.
- `수련 상태`
  - Shows current mode, selected target, star tier, and last tick timestamp.

## 3) Persistent Storage Contract
- Existing user training fields remain canonical:
  - `users.training_mode` (`NONE | INNER_ART | SKILL | MERIDIAN_ART`)
  - `users.training_target_id` (active focus id)
- Add normalized master tables for validation:
  - `inner_arts` (inner-art definitions and balance coefficients)
  - `sect_default_inner_arts` (one default inner art per sect)
  - `martial_skills` (skill definitions for `SKILL` mode)
- Add optional relation for user ownership/unlock progression:
  - `user_inner_arts` (`user_id`, `inner_art_id`, stars, points, unlocked_at)
  - `user_skills` (`user_id`, `skill_id`, stars, points, unlocked_at)

## 4) Sect Default Inner Arts (Seed-Fixed)
- `SECT_CHEONGUN` -> `INNER_CHEONGUN` (`청운심법`)
- `SECT_MYEONGYO` -> `INNER_HYEOLYEOM` (`혈염심공`)
- `SECT_HEUKRINHOE` -> `INNER_MUHYEONG` (`무형심법`)

When a user is assigned to a sect for the first time, server must ensure:
- the sect default inner art is unlocked for the user
- default focus can optionally be auto-set to that inner art (policy flag; default `false` for now)

## 5) Inner Art Definitions (v2 Draft)

### 5.1 `INNER_CHEONGUN` (청운심법)
- Concept: stable orthodox growth, strong long-term consistency.
- Meridian growth (per 10-minute tick):
  - `DAEMAC`: `1.0`
  - `GIHAE`: `0.8`
  - `IMMAC`: `0.3`
  - `DOKMAC`: `0.0`
  - `CHUNGMAC`: `0.0`
- Combat indirect modifiers:
  - `qi_regen_mult`: `1.05`
  - `stability_regen_mult`: `1.10`
  - `backlash_mult`: `0.90`
  - `inner_injury_mult`: `0.90`
- Breakthrough (`5+`):
  - lower failure penalty than other sect defaults
  - stability recovery bonus is strongly noticeable on success
- Mutation candidate:
  - `INNER_CHEONGUN_GEUMGANG` (청운금강)
  - Trigger profile: very high `DAEMAC/GIHAE`, very low `DOKMAC/CHUNGMAC`

### 5.2 `INNER_HYEOLYEOM` (혈염심공)
- Concept: explosive growth and high combat upside with higher stability risk.
- Meridian growth (per 10-minute tick):
  - `DOKMAC`: `1.0`
  - `CHUNGMAC`: `1.0`
  - `GIHAE`: `0.2`
  - `IMMAC`: `0.0`
  - `DAEMAC`: `0.0`
- Combat indirect modifiers:
  - `attack_related_mult`: `TBD`
  - `qi_cost_mult`: `TBD`
  - `stability_regen_mult`: `TBD`
  - `inner_injury_mult`: `TBD`
- Breakthrough (`5+`):
  - high upside on success
  - high penalty on failure
- Mutation candidate:
  - `INNER_HYEOLMA` (혈마심공)
  - Trigger profile: extreme `DOKMAC/CHUNGMAC` concentration

### 5.3 `INNER_MUHYEONG` (무형심법)
- Concept: practical survivability and sustain; lower direct burst.
- Meridian growth (per 10-minute tick):
  - `IMMAC`: `1.0`
  - `GIHAE`: `0.8`
  - `DAEMAC`: `0.3`
  - `DOKMAC`: `0.0`
  - `CHUNGMAC`: `0.0`
- Combat indirect modifiers:
  - `qi_regen_mult`: `TBD`
  - `stability_regen_mult`: `TBD`
  - `initiative_mult`: `TBD`
  - `burst_damage_mult`: `TBD`
- Breakthrough (`5+`):
  - sustain/stability gains are more visible than burst gains
  - failure penalty is medium
- Mutation candidate:
  - `INNER_MUYEONG` (무영심법)
  - Trigger profile: high `IMMAC/GIHAE` + evasive/survival play pattern

## 6) Sect Lock Rule for Mutation/Awakening
- Rule is allowed: mutation or awakening can be blocked by sect.
- Example policy:
  - if current sect is `SECT_MYEONGYO`, block `INNER_HYEOLMA` awakening
- Final lock matrix is `TBD` and must be encoded in policy table before release.

## 7) Implementation Notes
- This spec is contract-first and should be implemented in this order:
  1. DB schema (`inner_arts`, `sect_default_inner_arts`, `martial_skills`, optional user tables)
  2. Seed defaults for 3 sects
  3. command parser extension (`수련 심법`, `수련 무공`, `수련 중지`, `수련 상태`)
  4. tick engine update to consume inner-art growth map
- Any `TBD` value must be explicitly finalized before production balancing tests.
