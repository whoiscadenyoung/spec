# Overview

`spec` is a TypeScript/Bun CLI that ports the [spec-kit](https://github.com/github/spec-kit) bash scripts into a distributable package. It provides a structured workflow for Spec-Driven Development: initializing a repository with AI agent prompt files, creating GitHub issues and feature branches with specification documents, writing implementation plans, validating prerequisites, and keeping AI agent context files synchronized with the active feature.

## Origin

The original spec-kit scripts (`create-new-feature.sh`, `setup-plan.sh`, `check-prerequisites.sh`, `update-agent-context.sh`, and `common.sh`) were bash-only and local to each repository. This CLI replaces them with a single installable package that works across any project.

## Commands

| Command | Description |
|---------|-------------|
| `init` | Bootstrap a repo with Copilot prompt files and VS Code settings |
| `create issue` | Create a GitHub issue and return its number and URL |
| `create spec` | Create a feature branch, generate `spec.md`, commit, and push |
| `plan create` | Create `plan.md` for the current feature branch |
| `check-requirements` | Validate that required spec docs exist |
| `update-context` | Sync AI agent context files with the active feature |

## Typical Workflow

```sh
# 1. Create a GitHub issue
spec create issue --type feature --title "Add user authentication" --body "..."
# → { "issueNumber": 42, "issueUrl": "..." }

# 2. Create the feature branch and spec file
spec create spec --type feature --number 42 --slug "user-auth"
# → { "branchName": "feature/42-user-auth", "specFile": "...", "featureDir": "..." }

# 3. Fill out the spec, then create the implementation plan
spec plan create

# 4. Keep AI agent context in sync as you work
spec update-context --agent claude
```

## Usage

All commands output JSON to stdout. Errors are written as JSON to stderr and exit with code 1. Error output includes a `scope` field on multi-stage commands to indicate which step failed.

In development:

```sh
bun dev init --ai copilot
bun dev create issue --type feature --title "Add user auth" --body "..."
bun dev create spec --type feature --number 42 --slug "user-auth"
bun dev plan create
bun dev check-requirements
bun dev update-context --agent claude
```

From another repository (no install required):

```sh
bunx spec init --ai copilot
bunx spec create issue --type feature --title "Add user auth" --body "..."
bunx spec create spec --type feature --number 42 --slug "user-auth"
bunx spec plan create
bunx spec check-requirements
bunx spec update-context --agent claude
```

## Key Design Principles

- **Works from any repo** — all paths resolve from `process.cwd()` up to the git root, so the CLI operates on the calling repository's files, not its own
- **Native Bun APIs for I/O** — `Bun.file()`, `Bun.write()`, `node:fs` for file operations; `Bun.$` shell only for git commands
- **Bundled template fallback** — spec/plan templates are first sought in the calling repo's `.specify/templates/`, then fall back to copies bundled in this package
- **Bundled agent files** — Copilot prompt files ship with the package; `init` copies them into the calling repo where they can be customized
- **No global side effects** — all files are always written into the calling repo, never globally
- **Scoped error output** — multi-stage commands include a `scope` field in error JSON to identify which step failed

## Directory Structure

```
spec/
├── src/
│   ├── commands/          # One file per command (or command group)
│   │   ├── init.ts        # init
│   │   ├── create.ts      # create group (registers create issue + create spec)
│   │   ├── create/
│   │   │   ├── issue.ts   # create issue
│   │   │   └── spec.ts    # create spec
│   │   ├── plan.ts        # plan create
│   │   ├── check-requirements.ts
│   │   └── update-context.ts
│   ├── lib/               # Shared utilities
│   │   ├── git.ts         # Git operations via Bun.$
│   │   └── paths.ts       # Path resolution + template loading
│   └── index.ts           # CLI entry point
├── templates/             # Bundled templates
│   ├── spec-template.md
│   ├── plan-template.md
│   ├── .vscode/
│   │   └── settings.json  # VS Code settings merged by init
│   └── .github/
│       └── prompts/       # Copilot prompt files copied by init
└── docs/                  # This documentation
```

## Further Reading

- [Architecture](./architecture.md) — module responsibilities and data flow
- [Commands](./commands.md) — full option reference for each command
- [Design Decisions](./design-decisions.md) — rationale behind key choices
