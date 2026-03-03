# Design Decisions

## Bun APIs for I/O, shell only for git

File reads and writes use `Bun.file()` / `Bun.write()` and `node:fs` / `node:fs/promises`. Git operations use `Bun.$` shell calls rather than a git library.

Rationale: git's CLI is stable, well-understood, and handles edge cases (detached HEAD, shallow clones, worktrees) better than most Node.js git libraries. Bun's native file APIs are simpler and faster than shelling out for I/O.

## `process.cwd()` as the anchor point

`getRepoRoot()` walks up from `process.cwd()`, not from `import.meta.dir`. This means the CLI always operates on the repository it is *called from*, not the package's own location. This is what makes `bunx spec` work correctly from any project.

## Bundled templates with repo override

Templates ship with the package so the CLI works out of the box. If a calling repo has `.specify/templates/<name>`, that takes precedence. This lets projects customize their spec/plan structure without forking the CLI.

## Subcommands via `defineGroup`

`spec create` and `plan create` use Bunli's `defineGroup` / `defineCommand` pattern rather than flat top-level commands. This keeps the command surface clean and matches the natural grouping of the original bash scripts (spec-related operations vs plan-related operations).

## `<!-- spec-context:start/end -->` sentinels

Agent files often contain manually maintained content. Rather than overwriting the whole file, `update-context` writes a delimited block that can be idempotently replaced on subsequent runs. This lets developers keep their own content in CLAUDE.md or .windsurfrules alongside the generated context.

## Auto-detect vs explicit `--agent`

Without `--agent`, `update-context` only touches agent files that already exist in the repo. This avoids creating files for agents the developer doesn't use. With `--agent`, it creates the file if needed — useful for bootstrapping a new agent setup.

## Feature number deduplication across branches and directories

`getNextFeatureNumber()` checks both git branches (local + remote) and the `specs/` filesystem. A spec directory might outlive its branch (e.g., after a merge), so checking only git branches could produce collisions. Checking both sources ensures the number is unique.

## Branch name generation with stop-word filtering

The original `create-new-feature.sh` strips common English stop words before generating the branch name. This produces readable branch names from natural language descriptions: "Add user authentication system" → `001-user-authentication-system`. The stop word list is encoded directly in `src/commands/spec.ts` rather than an external config to keep the dependency surface minimal.

## No global agent file support

Agent files are always written into the calling repo. Global agent files (e.g., `~/.claude/CLAUDE.md`) are intentionally not supported — feature context is project-specific and shouldn't leak across repositories.

## `isFeatureBranch` pattern: `NNN-description`

The regex `^\d{3}-.+` requires exactly 3 digits. This matches the original bash scripts and provides a deterministic, human-readable sort order for up to 999 features per repository. The zero-padding in `getNextFeatureNumber` (`padStart(3, '0')`) enforces this at creation time.
