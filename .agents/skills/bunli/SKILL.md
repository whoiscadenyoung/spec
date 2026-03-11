---
name: bunli
description: >
  Comprehensive guide for developing with the Bunli CLI framework — a TypeScript-first CLI toolkit for Bun.
  Use this skill whenever you are building CLI commands with @bunli/core,
  creating or testing plugins, scaffolding new CLIs, writing bunli.config.ts, or working with any
  @bunli/* packages. Trigger on imports of @bunli/core, @bunli/cli, @bunli/test, @bunli/utils,
  @bunli/plugin-*, or create-bunli. Also trigger when the user mentions bunli commands, the bunli
  project structure, or asks how to structure a CLI project built on bunli.
---

# Bunli CLI Framework

## Quick Reference

### Key Commands

```bash
# Development (from repo root)
bun dev                    # Start development mode with watch
bun test                   # Run all tests
bun run build              # Build all packages
bun run clean              # Clean build artifacts
./dist/cli                 # Run built executable
```

### File Conventions

- **Naming**: Always kebab-case (`my-command.ts`, not `MyCommand.ts`)
- **Tests**: `.test.ts` suffix in `test/` directories
- **Exports**: Prefer named exports over default

### Common Imports

```typescript
// Core framework
import { defineCommand, defineConfig, option, createCLI } from '@bunli/core'
import { createPlugin } from '@bunli/core/plugin'

// Utilities
import { colors, spinner, prompt } from '@bunli/utils'

// Plugins
import { aiAgentPlugin } from '@bunli/plugin-ai-detect'
import { configMergerPlugin } from '@bunli/plugin-config'

// Testing
import { testCommand } from '@bunli/test'
```

---

## Project Structure

This is a monorepo organized into apps, packages, and examples.

### Core Packages

| Path | Purpose |
|------|---------|
| `@bunli/core` | Core CLI framework — `defineCommand`, `createCLI`, `option`, type-safe plugin system |
| `@bunli/generator` | TypeScript type generation from CLI commands |
| `@bunli/cli` | Main `bunli` CLI app (build, dev, init, release, test commands) |
| `@bunli/create-bunli` | Project scaffolding tool with templates |
| `@bunli/web` | Next.js documentation website |

### Plugin Packages

| Path | Purpose |
|------|---------|
| `@bunli/plugin-ai-detect` | Detects AI coding assistants (Claude, Cursor) from environment |
| `@bunli/plugin-config` | Loads and merges configuration from multiple sources |
| `@bunli/test` | Testing utilities with custom matchers and CLI test helpers |
| `@bunli/utils` | Shared utilities (colors, prompts, spinners, validation) |

---

## CLI Development Patterns

### Command Definition

```typescript
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export const buildCommand = defineCommand({
  name: 'build',
  description: 'Build the project',
  options: {
    output: option(
      z.string().default('dist'),
      { description: 'Output directory', short: 'o' }
    ),
    compress: option(
      z.boolean().default(false),
      { description: 'Compress output' }
    )
  },
  handler: async ({ flags, positional, shell, env, cwd, prompt, spinner, colors, context }) => {
    const spin = spinner(`Building to ${flags.output}...`)
    spin.start()

    // Access plugin context if available
    if (context?.env.isAIAgent) {
      console.log(`AI Agent detected: ${context.store.aiAgents.join(', ')}`)
    }

    await shell`bun build src/index.ts --outdir ${flags.output}`
    spin.succeed('Build complete!')
  }
})
```

All handler utilities — `flags`, `positional`, `shell`, `env`, `cwd`, `prompt`, `spinner`, `colors`, `context` — are injected automatically and are fully type-safe.

### Configuration (`bunli.config.ts`)

```typescript
import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'my-cli',
  version: '1.0.0',
  description: 'My CLI tool',
  build: {
    entry: 'src/index.ts',
    outdir: 'dist',
    targets: ['node16', 'bun'],
    compress: true
  },
  plugins: [
    // Plugin configuration
  ]
})
```

Config types are defined in `@bunli/core`.

### Plugin System

Create plugins with `createPlugin`:

```typescript
import { createPlugin } from '@bunli/core/plugin'

interface MyStore {
  count: number
  messages: string[]
}

const myPlugin = createPlugin<MyStore>({
  name: 'my-plugin',
  store: { count: 0, messages: [] },
  beforeCommand({ store }) {
    store.count++
  }
})
```

Register plugins when creating the CLI — use `as const` for better type inference:

```typescript
const cli = await createCLI({
  name: 'my-cli',
  plugins: [
    aiAgentPlugin(),
    configMergerPlugin({ sources: ['.myrc.json'] }),
    myPlugin
  ] as const
})
```

See `packages/plugin-ai-detect/` and `packages/plugin-config/` for reference implementations.

### Error Handling

- Use `colors.error()`, `colors.warn()`, `colors.info()` from handler context
- Throw meaningful errors with helpful messages
- Zod schemas provide automatic validation for command options
- Validation utilities are in `@bunli/utils`

---

## Testing

### Test File Structure

```typescript
import { describe, it, expect } from 'bun:test'
import { testCommand } from '@bunli/test'
import { myCommand } from '../src/commands/my-command.js'

describe('My Command', () => {
  it('should execute successfully', async () => {
    const result = await testCommand(myCommand, {
      flags: { input: 'test' }   // Named options go in 'flags'
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('success')
  })

  it('should handle positional arguments', async () => {
    const result = await testCommand(myCommand, {
      flags: { verbose: true },
      args: ['file1.txt', 'file2.txt']  // Positional args go in 'args'
    })
    expect(result.stdout).toContain('file1.txt')
  })

  it('should handle plugin context', async () => {
    const result = await testCommand(myCommand, {
      flags: { verbose: true },
      context: { store: { someData: 'test data' } }
    })
    expect(result.stdout).toContain('test data')
  })
})
```

Key distinction: `flags` for named options, `args` for positional arguments, `context` for plugin store.

### Plugin Testing

```typescript
import { describe, it, expect } from 'bun:test'
import { createCLI } from '@bunli/core'
import { myPlugin } from '../src'

describe('My Plugin', () => {
  it('should update store in beforeCommand', async () => {
    const cli = await createCLI({
      name: 'test-cli',
      plugins: [myPlugin({ verbose: true })]
    })
    // Test plugin behavior
  })
})
```

Test plugin lifecycle hooks, store functionality, and type inference with multiple plugins.

### Debugging

- Bun's built-in debugger: `bun --inspect`
- Color utilities for logging are in: `@bunli/utils`
- Test CLI commands in isolation with `@bunli/test`
- Hot-reload development: `bunli dev`

### Common Tasks

| Task | Location |
|------|----------|
| Add new command | `packages/cli/src/commands/` |
| Add new plugin | `packages/plugin-*/` |
