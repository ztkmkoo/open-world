---
name: git-workflow-skill
description: Enforce local branch-first Git execution for code-change tasks in this repository. Trigger when implementing/fixing/refactoring code that should end with a local commit. Do not trigger for read-only analysis, non-code discussion, or when user explicitly requests no Git workflow actions.
---

# Git Workflow Skill

Keep every change reviewable and safely isolated.

## Absolute Rules

1. Never work directly on `main` or `master`.
2. At start, check current branch and create/switch to a task-specific branch.
3. Choose branch names that reflect the task (feature/fix/scope).
4. If change size grows beyond human-review scale, split into separate tasks and branches.
5. Before commit, verify with `git status` and `git diff`.
6. Stage only intended files, then commit with a clear message.
7. Push/PR is forbidden unless user explicitly asks.

## Start Procedure

1. `git branch --show-current`
2. If on `main`/`master` or branch is unsuitable: `git checkout -b <task-branch>`
3. Confirm branch name matches requested scope.

## Size Guardrail

- Split when multiple features are mixed.
- Split when unrelated folders change together.
- Split when reviewer cannot understand in one pass.
- Proactively suggest the next branch plan when split is needed.

## Pre-Commit Procedure

1. `git status --short`
2. `git diff` and `git diff --staged` (if staged content exists)
3. `git add <scoped files>`
4. `git commit -m "<type>: <what changed>"`

## Example Prompts

- "Fix websocket reconnect bug with branch-first workflow and local commit only."
- "Add AOI chunk filter in a review-sized patch; split to a second branch if it gets large."
- "Create a task branch for movement sync cleanup and commit with a precise message."
