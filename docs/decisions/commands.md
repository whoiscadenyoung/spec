# Decisions Commands

CLI reference for `spec decisions`. All subcommands accept `--json` for structured output and `--path <dir>` to override the git repo root.

---

## `decisions init`

Bootstraps the `docs/decisions/` folder structure.

```sh
spec decisions init [--force] [--json] [--path <dir>]
```

Creates `docs/decisions/records/`, seeds it with `000-use-decision-records.md` from the bundled templates, and writes the initial `decision-log.md`. Fails if `docs/decisions/` already exists unless `--force` is passed, which removes and recreates the folder.

**Output:**
```
Initialized docs/decisions/ successfully.
  - docs/decisions/decision-log.md
  - docs/decisions/records/000-use-decision-records.md

Run `decisions create` to create your first decision record.
```

```json
{
  "status": "ok",
  "message": "Initialized docs/decisions/ successfully.",
  "files": [
    "docs/decisions/decision-log.md",
    "docs/decisions/records/000-use-decision-records.md"
  ],
  "nextSteps": ["Run `decisions create` to create your first decision record."]
}
```

---

## `decisions create`

Creates a new decision record with an auto-incremented ID.

```sh
spec decisions create --title <title> [--scope <scope>] [--description <desc>] [--status <status>] [--json] [--path <dir>]
```

`--title` is required. The slug is derived from the title automatically. `--status` defaults to `"Proposed"`; the only other valid value is `"Accepted"`. After writing the file, the command regenerates `decision-log.md`.

**Output:**
```
Created docs/decisions/records/003-use-typescript.md

  id:     003
  title:  Use TypeScript
  slug:   use-typescript
  date:   2026-03-11
  status: Proposed

Suggestions:
  - Add a --scope to categorise this record.
  - Add a --description for the decision log summary.
```

```json
{
  "status": "ok",
  "record": {
    "id": "003",
    "title": "Use TypeScript",
    "slug": "use-typescript",
    "filename": "003-use-typescript.md",
    "date": "2026-03-11",
    "scope": "",
    "status": "Proposed",
    "description": ""
  }
}
```

---

## `decisions sync`

Regenerates `decision-log.md` from the current state of all records.

```sh
spec decisions sync [--json] [--path <dir>]
```

Validates all records before syncing — exits without writing if any errors are found. Use `decisions validate --fix` to repair auto-fixable issues first.

**Output:**
```
Synced 5 record(s) to docs/decisions/decision-log.md

  001  Use TypeScript         [Accepted]
  002  Adopt ADRs             [Accepted]
  003  Use Bun                [Proposed]
```

```json
{
  "status": "ok",
  "synced": 5,
  "records": [
    { "id": "001", "title": "Use TypeScript", "status": "Accepted" },
    ...
  ]
}
```

---

## `decisions validate`

Checks all records for structural errors.

```sh
spec decisions validate [--fix] [--json] [--path <dir>]
```

| Error code | Description | Auto-fixable |
|------------|-------------|:---:|
| `ID_TYPE` | `id` field is a quoted string instead of a number | ✓ |
| `ID_MISMATCH` | `id` doesn't match the filename prefix | ✓ |
| `SLUG_MISMATCH` | `slug` doesn't match the filename suffix | ✓ |
| `DUPLICATE_ID` | Two files share the same `id` | — |
| `INVALID_STATUS` | `status` is not `Proposed` or `Accepted` | — |
| `INVALID_DATE` | `date` is not in `YYYY-MM-DD` format | — |

**Output (clean):**
```
✓ All decision records are valid.
```

**Output (errors found):**
```
❌ Found 2 validation error(s) in decision records:

  docs/decisions/records/003-use-typescript.md
    [ID_TYPE] id must be a number, not a string ("3")
  docs/decisions/records/004-bad-status.md
    [INVALID_STATUS] status "Draft" is not one of: Proposed, Accepted
    → Manual fix required.

Run `decisions validate --fix` to auto-fix 1 fixable error(s).
```

**Output (`--fix`):**
```
Fixed 1 error(s):

  docs/decisions/records/003-use-typescript.md
    ✓ [ID_TYPE] Updated to match filename.

✓ All errors have been fixed.
```

```json
{ "status": "ok", "valid": true, "errors": [] }
```

---

## `decisions list`

Lists all decision records with optional filtering.

```sh
spec decisions list [--scope <scope>] [--status <status>] [--full] [--json] [--path <dir>]
```

`--scope` and `--status` filters are case-insensitive. `--full` adds `Date` and `Path` to the output.

**Output:**
```
Found 3 record(s) in docs/decisions/records/

001  Use TypeScript  [Accepted]
     Scope: Architecture
     Adopt TypeScript as the primary language for all new code.
     Path:  001-use-typescript.md

002  Adopt ADRs  [Accepted]
     Scope: Process
     Path:  002-adopt-adrs.md
```

```json
{
  "status": "ok",
  "records": [
    {
      "id": "001",
      "title": "Use TypeScript",
      "path": "001-use-typescript.md",
      "scope": "Architecture",
      "status": "Accepted",
      "description": "Adopt TypeScript as the primary language for all new code."
    }
  ],
  "filters": { "status": "Accepted" }
}
```

The `filters` key is only present when at least one filter flag was passed.

---

## `decisions list-scopes`

Lists all unique scope values across records, sorted by count descending.

```sh
spec decisions list-scopes [--json] [--path <dir>]
```

Records without a `scope` are excluded from the tally.

**Output:**
```
Scope         Count
────────────  ─────
Architecture  5
Process       2
Security      1
```

```json
{
  "status": "ok",
  "scopes": [
    { "scope": "Architecture", "count": 5 },
    { "scope": "Process", "count": 2 },
    { "scope": "Security", "count": 1 }
  ]
}
```

---

## Typical Workflow

```sh
# One-time setup
spec decisions init

# Record a new decision
spec decisions create --title "Use Zod for validation" \
  --scope "Architecture" \
  --description "Zod provides runtime type safety with minimal boilerplate."

# Review all records
spec decisions list
spec decisions list --status Proposed

# Keep the log up to date after manual edits
spec decisions sync

# Lint records in CI
spec decisions validate
```
