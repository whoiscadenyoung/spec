# Architecture: Decisions Feature

This document covers the implementation of the `spec decisions` command group — how it is structured, how its components relate, and the design decisions that shaped it.

---

## Source Layout

```
src/
├── commands/
│   ├── decisions.ts               # Command group registration
│   └── decisions/
│       ├── init.ts
│       ├── create.ts
│       ├── sync.ts
│       ├── validate.ts
│       ├── list.ts
│       └── list-scopes.ts
└── lib/
    ├── decisions.ts               # All record I/O and business logic
    ├── git.ts                     # Repo root resolution
    └── errors.ts                  # Structured error handling

templates/
└── decisions/
    ├── records/
    │   ├── record-template.md     # Used by `decisions create`
    │   └── 000-use-decision-records.md   # Seeded by `decisions init`
    └── examples/                  # Reference records
```

Commands are thin handlers; all logic lives in `lib/decisions.ts`.

---

## Library: `lib/decisions.ts`

The core of the feature. Provides all data types, I/O, validation, and log generation.

**Data types**

- `DecisionRecord` — parsed representation of a record: `id`, `filename`, `title`, `slug`, `date`, `scope`, `status`, `description`
- `ValidationError` — `{ file, code, message, fixable }` describing a single frontmatter problem
- `ValidStatus` — union type `'Proposed' | 'Accepted'`

**ID and slug utilities**

- `slugify(title)` — lowercases and converts to kebab-case
- `formatId(n)` — zero-pads to three digits (`1` → `"001"`)
- `getNextId(recordsDir)` — scans existing filenames for the highest prefix and returns `n + 1`

**Record I/O**

- `parseFrontmatter(content)` — extracts the YAML block between `---` delimiters
- `readAllRecords(recordsDir)` — reads all `NNN-*.md` files, parses frontmatter, returns `DecisionRecord[]` sorted by ID

**Validation and repair**

- `validateRecord(filename, content)` — checks a single file for: `id` type (number vs. string), `id`/`slug` match against filename, valid `status`, valid `date` format
- `validateAllRecords(recordsDir)` — validates all files and checks for duplicate IDs across the set
- `fixRecord(recordPath, filename, errors)` — applies auto-fixes in place: strips quotes from `id` fields, rewrites `id`/`slug` to match filename

**Log generation**

- `generateDecisionLog(records)` — renders `decision-log.md` as a markdown table with columns: ID, Decision, Scope, Status, Record (link). The file is marked with a "do not manually modify" header.

---

## Library: `lib/git.ts`

Provides `getRepoRoot()`, which runs `git rev-parse --show-toplevel` or walks up the directory tree to find the `.git` folder. Every command defaults to this for locating `docs/decisions/`, unless `--path` is passed.

---

## Library: `lib/errors.ts`

`SpecError` extends `Error` with `code` and `suggestions`. Predefined errors relevant to decisions:

| Code | Trigger |
|------|---------|
| `ALREADY_EXISTS` | `docs/decisions/` exists and `--force` was not passed |
| `NOT_INITIALIZED` | `docs/decisions/records/` does not exist |
| `NOT_GIT_REPO` | `getRepoRoot()` could not find a git repo and `--path` was not passed |
| `VALIDATION_FAILED` | `validateAllRecords` found errors (thrown by `sync`) |

`handleError(err, json, context)` catches any error, formats it as human-readable or JSON, and exits with code 1.

---

## Design Decisions

**Filename as source of truth**

`id` and `slug` in frontmatter must match the filename. This makes the filename the authoritative identifier — it is stable even if frontmatter is edited incorrectly. Validation catches drift and `--fix` corrects it, keeping frontmatter in sync rather than letting two sources of truth diverge.

**Sequential IDs allocated at write time**

`getNextId` scans the directory at the moment `create` runs, rather than maintaining a counter file. This keeps the implementation simple and avoids a separate state file that could go out of sync. The trade-off is that concurrent `create` invocations on the same repo could produce duplicate IDs, but this is not a realistic scenario for a local CLI tool.

**`sync` validates before writing**

`decisions sync` runs `validateAllRecords` and exits on any error rather than writing a potentially incorrect log. This prevents the log from silently diverging from reality. The intended workflow when validation fails is: run `validate --fix`, resolve any remaining manual issues, then re-run `sync`.

**Auto-fix scope is intentionally narrow**

Only errors that can be derived unambiguously from the filename are auto-fixed: quoted IDs (`"1"` → `1`) and frontmatter values that don't match the filename prefix/suffix. Status and date errors require human judgement and are left for manual correction.

**`--path` flag for testability**

All commands accept `--path <dir>` to override `getRepoRoot()`. This allows tests to run against a temp directory without needing a real git repo, keeping the test suite fast and self-contained.

**Dual output modes**

All commands support `--json` for structured output (automation, CI) and human-readable output (interactive use). JSON success responses follow `{ status: "ok", ...data }`. JSON errors follow `{ status: "error", error: { code, message, suggestions, ... } }`.

---

## Data Flow

```
CLI (index.ts)
  └─ commands/decisions.ts  (group)
       ├─ init       → mkdir + copyFile + readAllRecords + generateDecisionLog
       ├─ create     → slugify + getNextId + template substitution + generateDecisionLog
       ├─ sync       → validateAllRecords + readAllRecords + generateDecisionLog
       ├─ validate   → validateAllRecords [+ fixRecord]
       ├─ list       → readAllRecords (+ filter)
       └─ list-scopes → readAllRecords → tally scopes
```
