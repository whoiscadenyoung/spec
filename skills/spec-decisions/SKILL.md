---
name: spec-decisions
description: >
  Create and manage architecture decision records (ADRs) for this project using the built-in CLI
  and template. Use this skill whenever the user asks to log, record, capture, or document a
  decision — including bug fix approaches, schema choices, architecture patterns, algorithm
  selections, or any technical trade-off. Also trigger when the user says "make an ADR", "add a
  decision record", "write this up", "capture this", or asks to find/look up a previous decision.
  When in doubt about whether something is worth recording: if the user just solved a non-obvious
  problem or made a deliberate choice between alternatives, this skill is appropriate.
---

# spec-decisions: Decision Records

This skill creates and looks up decision records — lightweight markdown files that capture *why*
a technical choice was made. They follow the ADR (Architecture Decision Record) pattern but apply
broadly to any decision: bug fixes, schema design, algorithm choices, tooling selections, etc.

The project has a CLI that handles file creation, numbering, and log management. Your job is to
determine the title/scope/description and fill in the record's narrative sections.

---

## Creating a Decision Record

### Step 1 — Gather metadata

Before running any commands, decide:

- **Title**: 2–5 words, descriptive but concise. Think of it as the decision's name, not a sentence.
  Good: `Extraction Border Padding`, `JWT Refresh Strategy`, `Compound Definitions as Injectable Constant`
  Avoid: `Fix the bug`, `Update logic`

- **Scope**: The area of the codebase or domain this applies to. Use the same scope as similar
  existing records if one fits. Examples: `Architecture`, `Authentication`, `Database`, `Routing`,
  `Detection`, `API`, `Testing`, `Infrastructure`.

- **Description**: 1–2 sentences summarising what was decided. This appears in the decision log
  and search results — make it specific enough to be useful at a glance.

### Step 2 — Check initialization

```
{SCRIPT} decisions status --json
```

Parse the JSON response:
- `{ "success": true, "data": { "initialized": true } }` → proceed to Step 3
- Any error (e.g. `NOT_INITIALIZED`) → run `{SCRIPT} decisions init --json`
  - If init succeeds, proceed to Step 3
  - If init fails, stop and report the error to the user

### Step 3 — Create the record

```
{SCRIPT} decisions create --title "TITLE" --scope "SCOPE" --description "DESCRIPTION" --json
```

On success, the response contains:
```json
{
  "success": true,
  "data": {
    "record": "docs/decisions/records/NNN-slug.md",
    "log": "docs/decisions/decision-log.md",
    "frontmatter": { ... }
  }
}
```

Extract `data.record` — that's the file path to edit next. If the command returns `"success": false`,
stop and report the error and suggestion from the response.

### Step 4 — Fill in the record

Open the file at `data.record`. It contains three sections with HTML comment blocks as guidance.
Replace each comment block with actual content. Do not leave comments in the finished file.

#### Context section (past tense)
Describe the situation that made this decision necessary:
- What problem, bug, or constraint existed?
- What behavior was observed? Be specific — name files, functions, classes, or data structures involved.
- What approaches were tried and rejected, and why?
- What external constraints applied (library behavior, spec requirements, performance limits)?

Write as if explaining to a future engineer who has never seen this code. Focus on facts, not opinions.

#### Decision section (present tense)
State what was decided and how it works:
- Describe the chosen approach in plain language first, then show the implementation.
- Include at least one code snippet if there's relevant code, with a fenced block and language tag.
  Reference the file and function: `Relevant code in src/foo.ts → functionName():`
- Briefly explain why this approach over alternatives (save detailed trade-off discussion for Consequences).

#### Consequences section (bullet points)
List outcomes — both good and bad:
- What bugs are fixed or capabilities unlocked?
- What are the negative trade-offs (memory usage, added complexity, maintenance burden)?
- What constraints does this place on future work?
- What follow-on decisions does this enable or require?

One sentence per bullet. Be concrete.

### Step 5 — Confirm to the user

After saving the file, tell the user:
- The path to the new record
- That they can open and review/approve it
- The current status is `Proposed` (they can change it to `Accepted` once satisfied)

---

## Looking Up Existing Decisions

When the user asks to find, check, or reference a previous decision:

```
{SCRIPT} decisions list --json
```

This returns all records with id, title, scope, status, description, and path.

To narrow by scope:
```
{SCRIPT} decisions list --scope "SCOPE" --json
```

To see what scopes exist:
```
{SCRIPT} decisions list-scopes
```

Review the returned records. If one sounds relevant based on title, scope, or description, read the
full file at the path provided to get the complete context.

---

## Style Reference

Before filling in a record, consider reading one of the example records in
`templates/decisions/examples/` to calibrate tone and depth. Key traits of good records:
- The Context is specific: it names files, functions, or images, not just "there was a problem"
- The Decision shows actual code when relevant, not just a description
- The Consequences are crisp: one outcome per bullet, no padding

---

## CLI Quick Reference

| Command | Purpose |
|---|---|
| `{SCRIPT} decisions status --json` | Check if decisions folder is initialized |
| `{SCRIPT} decisions init --json` | Initialize the decisions folder |
| `{SCRIPT} decisions create --title T --scope S --description D --json` | Create a new record |
| `{SCRIPT} decisions list --json` | List all records |
| `{SCRIPT} decisions list --scope S --json` | List records filtered by scope |
| `{SCRIPT} decisions list-scopes` | List all scopes with counts |
| `{SCRIPT} decisions validate` | Check all records for structural errors |
| `{SCRIPT} decisions sync` | Regenerate decision-log.md |

**JSON error format:**
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "suggestion": "..." } }
```

On any error, report the `message` and `suggestion` to the user and stop.
