---
name: model-switching-skill
description: Provide model-switching guidance for token savings and task-type routing in Codex CLI/App/IDE. Trigger when user asks about model choice, token limits, cheaper/faster options, or switching models per task (docs/design/coding/testing). Do not trigger when user already fixed a model and asks to proceed without recommendations.
---

# Model Switching Skill

Offer recommendations only. Do not force model changes.

## Absolute Rules

1. Treat model choice as advisory, never mandatory.
2. Optimize for user goal: quality, speed, or token/cost efficiency.
3. Recommend concrete model + reason based on task type.
4. Include both "switch now in current thread" and "set model on new run" methods.
5. If user declines switching, continue with current model without friction.

## Codex CLI Switching

- Current thread: use `/model` and choose target model.
- New execution: use `codex --model <model>` or `codex -m <model>`.

## Routing Policy (Example)

- Docs/summarization/cleanup: prefer smaller models (mini class).
- Architecture/design/complex debugging: prefer `gpt-5.3-codex`.
- Simple rename/format/trivial edits: prefer smaller models.
- Test-failure root-cause + fix loop: prefer medium-to-large models.

## Recommendation Format

1. Suggested model now
2. Why it fits this task
3. Lower-cost fallback model

## Example Prompts

- "I am worried about token usage. Which model should I use for simple doc cleanup?"
- "Need deep debugging for flaky tests. Recommend model and how to switch in CLI."
- "For this quick rename-only patch, suggest the cheapest safe model."
