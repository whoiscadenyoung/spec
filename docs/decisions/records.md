# Decision Records

Architecture Decision Records (ADRs) are lightweight markdown files that capture significant choices made in a project — what was decided, why, and what the consequences are.

---

## Folder Structure

```
docs/decisions/
├── decision-log.md          # Auto-generated index — do not edit manually
└── records/
    ├── 000-use-decision-records.md
    ├── 001-some-decision.md
    └── ...
```

Records are named `NNN-slug.md` where `NNN` is a zero-padded integer starting at `000`. The filename is the source of truth for `id` and `slug` — the CLI validates that frontmatter values match.

`decision-log.md` is regenerated automatically by `decisions create` and `decisions sync`. Do not edit it by hand.

---

## Record Format

Each file contains YAML frontmatter followed by three markdown sections.

```markdown
---
id: 1
title: Use TypeScript
slug: use-typescript
date: 2026-03-11
scope: Architecture
status: Proposed
description: Adopt TypeScript as the primary language for all new code.
---

## Context

...

## Decision

...

## Consequences

...
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Matches the numeric prefix in the filename. Must be a number, not a quoted string. |
| `title` | string | Short title describing what was decided. |
| `slug` | string | Kebab-case version of the title (e.g. `use-typescript`). Must match the filename suffix. |
| `date` | string | Date the decision was made, `YYYY-MM-DD` format. |
| `scope` | string | Area of the project this affects (e.g. `Architecture`, `Process`, `API`). |
| `status` | string | `Proposed` or `Accepted`. |
| `description` | string | One-sentence summary used in the decision log and tooling output. |

### Body Sections

**Context** — What situation or problem forced the decision. Write in past tense, factually. Include constraints, prior art, or alternatives that were considered.

**Decision** — What was decided and how it works. Write in present tense. Include code snippets or diagrams where they help.

**Consequences** — Bullet points covering positive effects, trade-offs, and constraints placed on future work.

---

## Creating a Record

The preferred way is via the CLI, which handles ID allocation and log regeneration automatically:

```sh
spec decisions create --title "Use Zod for validation" \
  --scope "Architecture" \
  --description "Zod provides runtime type safety with minimal boilerplate."
```

To create one manually:

1. Determine the next ID by checking the highest-numbered file in `records/`
2. Create `records/NNN-slug.md` using the template at `templates/decisions/records/record-template.md`
3. Fill in the frontmatter and the three sections
4. Run `spec decisions sync` to regenerate the log

---

## Status Values

| Status | Meaning |
|--------|---------|
| `Proposed` | Under consideration; not yet in effect |
| `Accepted` | In effect |

When a decision is superseded, update its status and add a note in the body referencing the new record. There is no automated superseded/deprecated tracking at this time.

---

## Examples

See `templates/decisions/examples/` for reference records showing the expected level of detail and writing style.
