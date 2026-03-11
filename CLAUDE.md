# Project Instructions

## Test-First Development

**When adding a new command or utility function, write a test for the desired pass state _before_ developing the implementation.**

1. Add the test file in the `tests/` directory, mirroring the path of the source file under `src/`.
2. Write tests that assert the expected *success* behaviour — do not tailor tests to make existing code pass.
3. Run `bun test` to confirm the new tests fail (red).
4. Implement the feature until the tests turn green.
5. Failing tests caused by unimplemented features are acceptable and expected.

## Testing Conventions

- **Framework**: `bun:test` with `@bunli/test` helpers (`testCommand`, `testCLI`).
- **Unit tests** (pure functions, lib utilities): import directly, use `mkdtempSync` in `/tmp` for any filesystem fixtures.
- **Command tests**: use `testCommand` for success paths; use `testCLI` for error paths that trigger `process.exit`.
- **No temp files in the repo**: all test artefacts go in the OS temp directory (`os.tmpdir()`).
- **`--path` flag**: all `decisions` commands accept `--path <dir>` to override the repo-root lookup. Pass this in tests instead of relying on a real git repository.
- Shared test utilities live in `tests/helpers.ts`.

## Project Structure

```
src/
  index.ts                        # CLI entry point
  lib/
    decisions.ts                  # Decision record utilities
    errors.ts
    git.ts
    paths.ts
  commands/
    decisions/
      init.ts                     # decisions init
      create.ts                   # decisions create
      sync.ts                     # decisions sync
      list.ts                     # decisions list  ← planned
templates/
  decisions/                      # Bundled ADR templates

tests/                            # Mirrors src/ structure
  helpers.ts                      # Shared test utilities (createTempDir, cleanupDir)
  lib/
    decisions.test.ts             # Unit tests for lib/decisions.ts
  commands/
    decisions/
      init.test.ts
      create.test.ts
      sync.test.ts
      list.test.ts                # Desired-state tests for planned list command
```

## Running Tests

```bash
bun test           # run all tests
bun test --watch   # watch mode
```
