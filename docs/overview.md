# Overview

`spec` is a TypeScript/Bun CLI that ports the [spec-kit](https://github.com/github/spec-kit) bash scripts into a distributable package. It provides a structured workflow for Spec-Driven Development: creating feature branches with specification documents, writing implementation plans, validating prerequisites, and keeping AI agent context files synchronized with the active feature.

## Origin

The original spec-kit scripts (`create-new-feature.sh`, `setup-plan.sh`, `check-prerequisites.sh`, `update-agent-context.sh`, and `common.sh`) were bash-only and local to each repository. This CLI replaces them with a single installable package that works across any project.

## Commands

| Command | Replaces | Description |
|---------|----------|-------------|
| `spec create` | `create-new-feature.sh` | Create a numbered feature branch and initialize `spec.md` |
| `plan create` | `setup-plan.sh` | Create `plan.md` for the current feature branch |
| `check-requirements` | `check-prerequisites.sh` | Validate that required spec docs exist |
| `update-context` | `update-agent-context.sh` | Sync AI agent context files with the active feature |

## Usage

In development:

```sh
bun dev spec create -d "add user authentication"
bun dev plan create
bun dev check-requirements
bun dev update-context --agent claude
```

From another repository (no install required):

```sh
bunx spec spec create -d "add user authentication"
bunx spec plan create
bunx spec check-requirements --json
bunx spec update-context --agent claude
```

## Key Design Principles

- **Works from any repo** — all paths resolve from `process.cwd()` up to the git root, so the CLI operates on the calling repository's files, not its own
- **Native Bun APIs for I/O** — `Bun.file()`, `Bun.write()`, `node:fs` for file operations; `Bun.$` shell only for git commands
- **Bundled template fallback** — templates are first sought in the calling repo's `.specify/templates/`, then fall back to the copies bundled in this package
- **No global side effects** — agent files (CLAUDE.md, copilot-instructions.md, etc.) are always written into the calling repo root, never globally

## Directory Structure

```
spec/
├── src/
│   ├── commands/          # One file per command (or command group)
│   │   ├── spec.ts        # spec create
│   │   ├── plan.ts        # plan create
│   │   ├── check-requirements.ts
│   │   └── update-context.ts
│   ├── lib/               # Shared utilities
│   │   ├── git.ts         # Git operations via Bun.$
│   │   └── paths.ts       # Path resolution + template loading
│   └── index.ts           # CLI entry point
├── templates/             # Bundled spec-template.md and plan-template.md
└── docs/                  # This documentation
```

## Further Reading

- [Architecture](./architecture.md) — module responsibilities and data flow
- [Commands](./commands.md) — full option reference for each command
- [Design Decisions](./design-decisions.md) — rationale behind key choices
