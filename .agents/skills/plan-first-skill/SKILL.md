---
name: plan-first-skill
description: Force a plan-first execution style for implementation tasks: present a small, reviewable step plan (goal, scope, verification, size) before edits, then execute against that plan and update it when reality changes. Trigger for coding tasks with file changes. Do not trigger for casual Q&A, pure brainstorming, or trivial no-edit responses.
---

# Plan First Skill

Plan first, then execute against the plan.
This skill must comply with `engineering-standards-skill`.

## Absolute Rules

1. Before any edit, produce a concrete step plan.
2. Each step must include: goal, edit scope (file/folder), verification method, expected change size.
3. Keep steps small enough for human review.
4. Start execution after presenting the plan; explicit user approval is not required.
5. If implementation diverges from plan, explain mismatch in 2-3 lines, update plan, continue.
6. Avoid bundling multiple features into one step unless explicitly requested.
7. Finish with plan-vs-result check.

## Plan Template

1. Step title
- Goal:
- Scope:
- Verification:
- Expected size:

## Divergence Policy

- State why the original step was insufficient.
- Replace/append only affected steps.
- Keep updated plan minimal and actionable.

## Example Prompts

- "Before coding AOI optimization, create a small-step plan and execute by that plan."
- "Add reconnect logic with plan-first workflow and update plan if extra files become necessary."
- "Implement one PR-sized movement fix using goal/scope/verification/size per step."
