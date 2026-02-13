---
name: verification-loop-skill
description: Enforce post-change verification for code work (bug fixes, features, refactors) with automatic test/build/lint/typecheck selection from package scripts and iterative fix-verify loops. Trigger after any code edit. Do not trigger for read-only analysis or pure documentation changes with no executable impact.
---

# Verification Loop Skill

Verification is mandatory after code changes.
This skill must comply with `engineering-standards-skill`.

## Absolute Rules

1. After any code edit, run verification before completion.
2. Select commands by inspecting `package.json` scripts in relevant app(s).
3. Prefer available commands among: `npm test`, `npm run build`, `npm run lint`.
4. If verification fails, summarize failure, list 1-3 root-cause candidates, apply minimal fix, and re-run.
5. Repeat up to 3 attempts maximum.
6. If still failing after 3 attempts, ask exactly 3 required questions and stop.
7. Always report executed commands and per-command success/failure.

## Command Selection Policy (Web Game Default)

- Server: detect and run existing scripts from `server/package.json`.
- Client: detect and run existing scripts from `client/package.json`.
- If only one command exists, run that command.
- If multiple exist, run in practical order: lint -> build -> test.

## Failure Loop Format

1. Failure summary (short)
2. Root-cause candidates (1-3)
3. Minimal patch
4. Re-run same verification set

## Output Requirements

- Include command list actually executed.
- Include each result: `success` or `failed`.
- Include final verification status.

## Example Prompts

- "Add dash cooldown and run mandatory verification loop."
- "Refactor movement packet parser and do fix-verify iterations until green."
- "After bugfix, auto-detect available scripts and report pass/fail per command."
