# Architecture

## Module Responsibilities

### `src/index.ts`

Entry point. Creates the Bunli CLI instance, registers all command groups and standalone commands, then calls `cli.run()`. No application logic lives here.

### `src/lib/git.ts`

All git operations. Uses `Bun.$` shell calls exclusively — git's CLI is stable and expressive enough that wrapping it in a native library would add complexity with no benefit.

| Export | Description |
|--------|-------------|
| `getRepoRoot()` | Tries `git rev-parse --show-toplevel`, falls back to walking up from `cwd` looking for `.git` or `.specify` |
| `getCurrentBranch()` | Checks `SPECIFY_FEATURE` env var, then `git rev-parse --abbrev-ref HEAD`, then scans `specs/` for the highest-numbered directory |
| `hasGit()` | Returns `true` if `git --version` succeeds |
| `isFeatureBranch(branch)` | Returns `true` if branch matches `NNN-description` (3 digits + hyphen) |
| `createBranch(name)` | Runs `git checkout -b <name>` |
| `getExistingBranches()` | Collects local + remote branches, strips `origin/` prefix |
| `getNextFeatureNumber(repoRoot)` | Scans existing branches and `specs/` dirs for taken numbers, returns the next available integer |

### `src/lib/paths.ts`

Pure path utilities. No shell calls. Uses `Bun.file()` for existence checks and `import.meta.dir` to locate bundled templates relative to the package.

| Export | Description |
|--------|-------------|
| `getFeaturePaths(repoRoot, branch)` | Returns the `FeaturePaths` struct with absolute paths for `specsDir`, `featureDir`, `spec.md`, `plan.md`, `tasks.md` |
| `findFeatureDirByPrefix(specsDir, prefix)` | Scans `specs/` for a directory starting with `NNN-`, allowing a branch rename without breaking the spec dir reference |
| `resolveTemplate(name, repoRoot)` | Checks `<repoRoot>/.specify/templates/<name>` first, then the bundled `templates/` directory |

### `src/commands/init.ts` — `init`

Bootstraps a repository for Spec-Driven Development:

1. Reads all files from the bundled `templates/.github/prompts/` directory
2. Copies them to `<repoRoot>/.github/prompts/`, skipping any that already exist (unless `--force`)
3. Reads the bundled `templates/.vscode/settings.json`
4. Deep-merges those settings into `<repoRoot>/.vscode/settings.json`, preserving any existing keys
5. Creates directories as needed

The bundled template root is resolved via `import.meta.dir` (same pattern as `resolveTemplate`).

### `src/commands/spec.ts` — `spec create`

Handles feature branch bootstrapping:

1. Resolves next feature number (checking git branches + specs dirs)
2. Generates a branch name from the description by lowercasing, stripping stop words, and joining with hyphens
3. Enforces GitHub's 244-byte branch name limit, truncating at word boundaries
4. Runs `git checkout -b` to create the branch
5. Creates `specs/<branch>/` and writes `spec.md` from template

### `src/commands/plan.ts` — `plan create`

Initializes the planning document for the current feature branch:

1. Validates the current branch matches the `NNN-description` pattern
2. Finds or creates the feature directory (by numeric prefix if needed)
3. Refuses to overwrite an existing `plan.md`
4. Writes `plan.md` from template

### `src/commands/check-requirements.ts` — `check-requirements`

Validates the feature workspace without modifying anything:

1. Confirms the current branch is a feature branch
2. Checks that `featureDir` and `plan.md` exist (exits 1 on failure)
3. Optionally requires `tasks.md` (`--require-tasks`)
4. Catalogs which optional docs exist: `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`
5. Supports `--paths-only` to print path variables for scripting use

### `src/commands/update-context.ts` — `update-context`

Keeps AI agent instruction files current with the active feature:

1. Reads `plan.md` and extracts tech context via regex (Language, Dependencies, Storage, Project Type)
2. Builds a fenced `<!-- spec-context:start/end -->` block with the extracted data
3. If the target agent file exists: replaces the existing block or appends a new one
4. If the target agent file doesn't exist: creates it with just the context block
5. Without `--agent`: auto-detects which agent files are already present in the repo and updates all of them

## Data Flow

```
User invokes command
        │
        ▼
  getRepoRoot()          ← walks up from process.cwd()
        │
        ▼
  getCurrentBranch()     ← git / env var / specs/ scan  (not needed by init)
        │
        ▼
  getFeaturePaths()      ← pure path computation        (not needed by init)
        │
        ├── read files   ← Bun.file().text()
        ├── write files  ← Bun.write()
        └── git ops      ← Bun.$`git ...`
```

## Calling Repo Convention

All commands operate on the repository from which they are invoked. After `init`, the typical structure is:

```
<calling-repo>/
├── .git/
├── .github/
│   ├── prompts/                    ← written by init
│   │   ├── speckit.specify.prompt.md
│   │   └── ...
│   └── copilot-instructions.md    ← written by update-context
├── .vscode/
│   └── settings.json              ← merged by init
├── specs/
│   └── 001-my-feature/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
└── CLAUDE.md                      ← written by update-context
```

The CLI package itself is never modified by any command.
