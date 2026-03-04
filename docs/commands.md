# Commands

All commands output JSON to stdout. Errors are written as JSON to stderr and exit with code 1.

---

## `init`

Bootstrap a repository with GitHub Copilot prompt files and VS Code settings for Spec-Driven Development.

```sh
spec init --ai <agent> [options]
```

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--ai` | `-a` | `copilot` | AI agent to configure (required) |
| `--force` | `-f` | boolean | Overwrite existing prompt files |

**What it does**:

1. Copies 9 bundled prompt files into `.github/prompts/` in the calling repo
2. Deep-merges VS Code settings into `.vscode/settings.json`

**Prompt files installed** (into `.github/prompts/`):

| File | Purpose |
|------|---------|
| `speckit.specify.prompt.md` | Create or update a feature specification |
| `speckit.clarify.prompt.md` | Resolve ambiguities in a spec |
| `speckit.plan.prompt.md` | Generate an implementation plan |
| `speckit.tasks.prompt.md` | Break a plan into ordered tasks |
| `speckit.implement.prompt.md` | Execute tasks phase by phase |
| `speckit.constitution.prompt.md` | Create or update the project constitution |
| `speckit.analyze.prompt.md` | Cross-artifact consistency analysis |
| `speckit.checklist.prompt.md` | Requirements quality checklist |
| `speckit.taskstoissues.prompt.md` | Convert tasks to GitHub issues |

**VS Code settings merged** into `.vscode/settings.json`:

```json
{
  "chat.promptFilesRecommendations": {
    "speckit.constitution": true,
    "speckit.specify": true,
    "speckit.clarify": true,
    "speckit.plan": true,
    "speckit.tasks": true,
    "speckit.implement": true,
    "speckit.analyze": true,
    "speckit.checklist": true,
    "speckit.taskstoissues": true
  }
}
```

Existing keys in `.vscode/settings.json` are never overwritten — the merge only adds keys that are absent.

Existing prompt files are skipped unless `--force` is passed.

**Output**:
```json
{
  "promptsCopied": ["speckit.specify.prompt.md", "..."],
  "promptsSkipped": [],
  "vscodeSettingsUpdated": "/path/to/repo/.vscode/settings.json"
}
```

---

## `create issue`

Create a GitHub issue and return its number and URL. Requires the `gh` CLI to be installed and authenticated (`gh auth login`).

```sh
spec create issue --type <type> --title <title> --body <body>
```

| Option | Short | Type | Required | Description |
|--------|-------|------|----------|-------------|
| `--type` | `-t` | `fix` \| `feature` | yes | Issue type: `"fix"` for bug fixes, `"feature"` for new features, improvements, or refactors. Used as the branch-name prefix in `create spec`. |
| `--title` | | string | yes | Descriptive issue title (max 256 characters). Becomes the GitHub issue title. |
| `--body` | `-b` | string | yes | Full feature or bug description. Becomes the GitHub issue body. |

**Validation**:
- `--type` must be `"fix"` or `"feature"`
- `--title` must not exceed 256 characters (GitHub's limit)

**Output**:
```json
{ "issueNumber": 42, "issueUrl": "https://github.com/owner/repo/issues/42" }
```

**Error output** includes a `scope` field indicating the failure stage:

| Scope | Meaning |
|-------|---------|
| `validation` | Input failed a validation check before any GitHub call was made |
| `issue_creation` | The `gh issue create` call failed |

```json
{ "error": "Issue title exceeds GitHub's maximum of 256 characters (got 300).", "scope": "validation" }
```

---

## `create spec`

Create a feature branch, generate a `spec.md` from the project template, commit it, push the branch, and link the branch to its GitHub issue. Run `create issue` first to obtain the issue number.

```sh
spec create spec --type <type> --number <number> --slug <slug>
```

| Option | Short | Type | Required | Description |
|--------|-------|------|----------|-------------|
| `--type` | `-t` | `fix` \| `feature` | yes | Issue type: `"fix"` for bug fixes, `"feature"` for new features, improvements, or refactors. Used as the branch-name prefix (e.g., `feature/123-user-auth`). |
| `--number` | `-n` | integer | yes | GitHub issue number returned by `create issue`. Included in the branch name and spec directory path (e.g., `feature/123-user-auth`, `specs/123-user-auth/`). |
| `--slug` | `-s` | string | yes | Concise 2-4 word identifier for the feature, using lowercase letters, numbers, and hyphens (e.g., `"user-auth"`, `"analytics-dashboard"`). No leading, trailing, or consecutive hyphens. |

**Validation**:
- `--type` must be `"fix"` or `"feature"`
- `--number` must be a positive integer
- `--slug` must match `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase alphanumeric words separated by single hyphens)
- Full branch name (`{type}/{number}-{slug}`) must be ≤ 255 bytes (GitHub's limit)

**What it does**:

1. Validates all inputs against GitHub constraints
2. Creates and checks out a new branch: `{type}/{number}-{slug}` (e.g., `feature/123-user-auth`)
3. Creates the spec directory: `specs/{number}-{slug}/` (e.g., `specs/123-user-auth/`)
4. Generates `spec.md` from the project template (`.specify/templates/spec-template.md`, or the bundled fallback)
5. Stages the new spec file with `git add`
6. Commits with message: `Create spec for issue #{number}: {slug}`
7. Pushes the branch to the remote with `git push -u origin {branchName}`
8. Links the branch to its GitHub issue via `gh issue develop`
9. Posts a comment on the issue listing each created file as a permalink to that exact commit, so the links remain stable even if the files change in future commits

**Output**:
```json
{
  "branchName": "feature/123-user-auth",
  "specFile": "/path/to/repo/specs/123-user-auth/spec.md",
  "featureDir": "/path/to/repo/specs/123-user-auth"
}
```

**Error output** includes a `scope` field indicating the failure stage:

| Scope | Meaning |
|-------|---------|
| `validation` | Input failed a validation check before any filesystem or git operation |
| `branch_creation` | `git checkout -b` failed |
| `template_creation` | Creating the directory or writing `spec.md` failed |
| `git_staging` | `git add` failed |
| `git_commit` | `git commit` failed |
| `git_push` | `git push` failed |
| `issue_link` | `gh issue develop` failed to link the branch to the issue |
| `issue_comment` | `gh issue comment` failed to post the file summary comment |

```json
{ "error": "remote: Repository not found.", "scope": "git_push" }
```

**Template**: `spec.md` is populated from `.specify/templates/spec-template.md` in the calling repo, or the bundled `templates/spec-template.md` as a fallback.

---

## `plan create`

Create a `plan.md` implementation plan for the current feature branch.

```sh
spec plan create
```

No options. Must be run from a feature branch (`NNN-description` format). Errors if `plan.md` already exists. Creates the feature directory if it doesn't exist yet.

**Output**:
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
| `--require-tasks` | | boolean | Also require `tasks.md` to exist |
| `--paths-only` | | boolean | Output path variables only, skip validation |

Exits with code 1 if required files are missing.

**Checked files** (required): `featureDir/`, `plan.md`

**Catalogued files** (optional, reported): `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `tasks.md`, `contracts/`

**Output**:
```json
{ "ok": true, "featureDir": "...", "availableDocs": ["spec.md", "plan.md"] }
```

**Output (`--paths-only`)**:
```json
{
  "repoRoot": "...",
  "branch": "001-user-authentication",
  "featureDir": "...",
  "specPath": "...",
  "planPath": "...",
  "tasksPath": "..."
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

**Output**:
```json
{ "updated": ["CLAUDE.md", ".github/copilot-instructions.md"] }
```
