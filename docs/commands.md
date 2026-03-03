# Commands

## `spec create`

Create a new numbered feature branch and initialize a `spec.md` document.

```sh
spec spec create [options]
```

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--description` | `-d` | string | Feature description (used to generate branch name) |
| `--short-name` | | string | Override the generated branch name suffix |
| `--number` | | integer | Override the auto-assigned feature number |
| `--json` | `-j` | boolean | Output result as JSON |

**Branch naming**: The description is lowercased, stop words are removed, and the remaining words are joined with hyphens. The branch name is prefixed with the zero-padded feature number: `001-user-authentication`. Names longer than 244 bytes are truncated at the nearest word boundary.

**Stop words removed**: `the`, `a`, `an`, `is`, `are`, `was`, `were`, `be`, `been`, `being`, `have`, `has`, `had`, `do`, `does`, `did`, `will`, `would`, `shall`, `should`, `may`, `might`, `can`, `could`, `add`, `new`, `create`, `update`, `fix`, `for`, `to`, `in`, `on`, `at`, `by`, `with`, `from`, `of`, `and`, `or`, `but`, `not`, `this`, `that`, `these`, `those`

**Auto-numbering**: Scans both existing git branches (local + remote) and `specs/` directories to find the next unused number.

**Output (text)**:
```
✓ Created branch: 001-user-authentication
✓ Created spec: /path/to/repo/specs/001-user-authentication/spec.md
```

**Output (JSON)**:
```json
{ "branch": "001-user-authentication", "specFile": "/path/to/repo/specs/001-user-authentication/spec.md", "featureNumber": 1 }
```

**Template**: `specs/<branch>/spec.md` is populated from `.specify/templates/spec-template.md` in the calling repo, or the bundled `templates/spec-template.md` as a fallback.

---

## `plan create`

Create a `plan.md` implementation plan for the current feature branch.

```sh
spec plan create [options]
```

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--json` | `-j` | boolean | Output result as JSON |

Must be run from a feature branch (`NNN-description` format). Errors if `plan.md` already exists. Creates the feature directory if it doesn't exist yet.

**Output (text)**:
```
✓ Created plan: /path/to/repo/specs/001-user-authentication/plan.md
```

**Output (JSON)**:
```json
{ "branch": "001-user-authentication", "planFile": "...", "featureDir": "..." }
```

**Template**: Populated from `.specify/templates/plan-template.md` in the calling repo, or the bundled `templates/plan-template.md` as a fallback.

---

## `check-requirements`

Validate that required documentation files exist for the current feature branch.

```sh
spec check-requirements [options]
```

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--json` | `-j` | boolean | Output result as JSON |
| `--require-tasks` | | boolean | Also require `tasks.md` to exist |
| `--paths-only` | | boolean | Print path variables only, skip validation |

Exits with code 1 if required files are missing.

**Checked files** (required): `featureDir/`, `plan.md`

**Catalogued files** (optional, reported): `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `tasks.md`, `contracts/`

**Output (text)**:
```
Feature: 001-user-authentication
Directory: /path/to/repo/specs/001-user-authentication

  ✓ spec.md
  ✓ plan.md
  ○ research.md
  ○ data-model.md
  ○ quickstart.md
  ○ tasks.md
  ○ contracts/
```

**Output (JSON)**:
```json
{ "ok": true, "featureDir": "...", "availableDocs": ["spec.md", "plan.md"] }
```

**Output (`--paths-only` JSON)**:
```json
{
  "REPO_ROOT": "...",
  "BRANCH": "001-user-authentication",
  "FEATURE_DIR": "...",
  "FEATURE_SPEC": "...",
  "IMPL_PLAN": "...",
  "TASKS": "..."
}
```

---

## `update-context`

Update AI agent instruction files with current feature branch context, parsed from `plan.md`.

```sh
spec update-context [options]
```

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--agent` | `-a` | string | Specific agent to update. Omit to update all detected agents. |

Requires the current branch to be a feature branch and `plan.md` to exist.

**Supported agents**:

| Name | File path |
|------|-----------|
| `claude` | `CLAUDE.md` |
| `gemini` | `GEMINI.md` |
| `codex` | `AGENTS.md` |
| `amp` | `AMP.md` |
| `copilot` | `.github/copilot-instructions.md` |
| `cursor` | `.cursor/rules/spec-context.mdc` |
| `windsurf` | `.windsurfrules` |

**Auto-detect mode** (no `--agent`): updates all agent files that already exist in the calling repo. Does nothing if none are found.

**Create mode** (`--agent <name>`): creates the agent file if it doesn't exist, with just the context block as content.

**Context block format** (inserted between sentinel comments):
```markdown
<!-- spec-context:start -->
## Active Feature

**Branch**: `001-user-authentication`
**Language**: TypeScript 5
**Dependencies**: Bun, Zod
**Storage**: N/A
**Project Type**: cli

**Spec files**: `specs/001-user-authentication/`
<!-- spec-context:end -->
```

If the file already contains a `<!-- spec-context:start/end -->` block it is replaced in place. Otherwise the block is appended to the end of the file.

The tech context values are parsed from the `## Technical Context` section of `plan.md` by matching `**Label**: value` patterns.
