# Skill: spec-decisions

This document covers the `spec-decisions` agent skill — what it does, where it lives, how it is structured, and the design decisions made during its creation.

---

## Overview

The `spec-decisions` skill enables AI agents (Claude Code, etc.) to create and look up decision records using the project's CLI as a harness. Agents handle the narrative content; the CLI handles file creation, ID assignment, slug generation, and log maintenance.

The skill lives at:

```
skills/
└── spec-decisions/
    ├── SKILL.md          # Skill instructions loaded into agent context
    └── evals/
        └── evals.json    # Test prompts for quality evaluation
```

---

## Trigger Conditions

The skill is designed to activate on natural user requests such as:

- "record this decision", "log a decision", "document this"
- "make an ADR", "add a decision record", "create an ADR"
- "capture this", "write this up"
- "find a previous decision", "do we have a decision about X"

The description is intentionally "pushy" — it errs toward triggering rather than staying silent, since under-triggering is a common failure mode for skills.

---

## Skill Structure

### SKILL.md

The main instruction file. Contains:

- **Frontmatter**: `name` and `description` (the description is the primary triggering mechanism)
- **Creating a record**: step-by-step workflow using the CLI
- **Looking up decisions**: list/filter commands with guidance on reviewing results
- **Template writing guide**: how to fill in Context, Decision, and Consequences sections
- **CLI quick reference**: table of all relevant commands

Kept under 500 lines so the full file loads into agent context on trigger.

### evals/evals.json

Three test prompts covering:

1. Recording a bug fix decision (TypeScript `satisfies` vs type assertion)
2. Recording an explicit architectural choice (session token storage)
3. Looking up existing decisions before making a new change

---

## Design Decisions

### {SCRIPT} placeholder

The CLI invocation uses `{SCRIPT}` as a placeholder throughout `SKILL.md` rather than a hardcoded command. This defers the question of how the CLI is executed (e.g. `bun run src/index.ts`, a compiled binary, an npm script) until that is settled. When the execution method is determined, a find-and-replace across the skill file is all that's needed.

### CLI as harness

The skill delegates all file system operations to the CLI rather than having the agent create files directly. This keeps agents from having to determine the next record ID, construct the filename slug, or update `decision-log.md` manually. The agent's job is purely content — title, scope, description, and narrative prose.

### Status check before create

The workflow checks `decisions status --json` before attempting `decisions create`. This allows the agent to detect an uninitialized repo and run `decisions init` automatically, rather than surfacing a cryptic `NOT_INITIALIZED` error to the user.

### Scope as free-form text

The `--scope` flag accepts any string, so agents are instructed to match existing scope names when possible (discovered via `decisions list-scopes`) rather than inventing new ones. This keeps the scope vocabulary consistent without enforcing a fixed enum in the CLI.

### Template guidance calibrated to examples

The Context/Decision/Consequences writing guide in `SKILL.md` was written by reading the four example records in `templates/decisions/examples/`. Key style traits extracted: past tense in Context, present tense in Decision, one-sentence bullets in Consequences, and code snippets with file+function references in Decision.

### Evals alongside the skill

Test prompts live inside the skill directory (`evals/evals.json`) rather than at the project root. This keeps the skill self-contained and makes it easy to run the skill-creator's evaluation loop against them in the future.

---

## Next Steps

- **Resolve `{SCRIPT}`**: once the CLI execution method is finalized, update all occurrences in `SKILL.md`.
- **Run evals**: use the skill-creator's `generate_review.py` and `run_loop.py` to measure trigger accuracy and output quality.
- **Description optimization**: after real-world use, the `run_loop.py` script can tune the `description` field for better triggering.
- **Proactive suggestion**: consider whether agents should offer to create a record automatically after solving a non-obvious problem, rather than waiting for the user to ask.
