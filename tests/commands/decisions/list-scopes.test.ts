/**
 * Tests for `decisions list-scopes` — a planned command that lists all unique
 * scopes used across decision records, with counts.
 *
 * These tests describe the *desired* success state. The command does not yet
 * exist; failing tests here are expected and acceptable until it is
 * implemented.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { testCommand, testCLI } from '@bunli/test'
import { createTempDir, cleanupDir } from '../../helpers.js'
import initDecisionsCommand from '../../../src/commands/decisions/init.js'
import createDecisionCommand from '../../../src/commands/decisions/create.js'
import decisionsGroup from '../../../src/commands/decisions.js'

let dir: string

beforeEach(async () => {
  dir = createTempDir()
  await testCommand(initDecisionsCommand, { flags: { path: dir } })
})

afterEach(() => {
  cleanupDir(dir)
})

// ---------------------------------------------------------------------------
// Success states
// ---------------------------------------------------------------------------

describe('decisions list-scopes — success', () => {
  it('exits with code 0 when the decisions folder is initialised', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir]
    )
    expect(result.exitCode).toBe(0)
  })

  it('outputs each unique scope name', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', scope: 'Infrastructure' },
    })
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', scope: 'Architecture' },
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir]
    )
    expect(result.stdout).toContain('Infrastructure')
    expect(result.stdout).toContain('Architecture')
  })

  it('shows the count of records per scope', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', scope: 'Infrastructure' },
    })
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Redis', scope: 'Infrastructure' },
    })
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', scope: 'Architecture' },
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir]
    )
    // Infrastructure has 2, Architecture has 1
    expect(result.stdout).toContain('2')
    expect(result.stdout).toContain('1')
  })

  it('deduplicates scopes (same scope used by multiple records appears once)', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', scope: 'Infrastructure' },
    })
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Redis', scope: 'Infrastructure' },
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir]
    )
    // Count occurrences of 'Infrastructure' — should only appear once as a row label
    const matches = result.stdout.match(/Infrastructure/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('succeeds and outputs a no-scopes message when no records exist', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir]
    )
    expect(result.exitCode).toBe(0)
  })

  it('records with an empty scope are not included in the scope list', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres' }, // no scope
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir]
    )
    expect(result.exitCode).toBe(0)
    // Should not show an empty scope entry
    expect(result.stdout).not.toMatch(/^\s*\d+\s*$/)
  })
})

// ---------------------------------------------------------------------------
// --json flag
// ---------------------------------------------------------------------------

describe('decisions list-scopes --json', () => {
  it('outputs valid JSON', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', scope: 'Infrastructure' },
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir, '--json']
    )
    expect(() => JSON.parse(result.stdout)).not.toThrow()
  })

  it('JSON payload has status "success"', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir, '--json']
    )
    expect(JSON.parse(result.stdout).status).toBe('success')
  })

  it('JSON payload contains a scopes array', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', scope: 'Infrastructure' },
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir, '--json']
    )
    const scopes = JSON.parse(result.stdout).data.scopes
    expect(Array.isArray(scopes)).toBe(true)
  })

  it('each entry in the scopes array has scope and count fields', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', scope: 'Infrastructure' },
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir, '--json']
    )
    const entry = JSON.parse(result.stdout).data.scopes[0]
    expect(entry).toHaveProperty('scope')
    expect(entry).toHaveProperty('count')
  })

  it('count accurately reflects number of records per scope', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', scope: 'Infrastructure' },
    })
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Redis', scope: 'Infrastructure' },
    })
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', scope: 'Architecture' },
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list-scopes', '--path', dir, '--json']
    )
    const scopes: Array<{ scope: string; count: number }> = JSON.parse(result.stdout).data.scopes
    const infra = scopes.find((s) => s.scope === 'Infrastructure')
    const arch = scopes.find((s) => s.scope === 'Architecture')
    expect(infra?.count).toBe(2)
    expect(arch?.count).toBe(1)
  })

  it('outputs valid JSON on error when not initialised', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'list-scopes', '--path', freshDir, '--json']
      )
      expect(() => JSON.parse(result.stdout)).not.toThrow()
      expect(JSON.parse(result.stdout).status).toBe('error')
    } finally {
      cleanupDir(freshDir)
    }
  })
})

// ---------------------------------------------------------------------------
// Error states
// ---------------------------------------------------------------------------

describe('decisions list-scopes — errors', () => {
  it('exits with a non-zero code when decisions have not been initialised', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'list-scopes', '--path', freshDir]
      )
      expect(result.exitCode).not.toBe(0)
    } finally {
      cleanupDir(freshDir)
    }
  })

  it('reports NOT_INITIALIZED when the records directory is missing', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'list-scopes', '--path', freshDir]
      )
      expect(result.stderr).toContain('NOT_INITIALIZED')
    } finally {
      cleanupDir(freshDir)
    }
  })
})
