/**
 * Tests for `decisions list` — a planned command that lists all decision
 * records from docs/decisions/records/ in a human-readable format.
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

describe('decisions list — success', () => {
  it('exits with code 0 when the decisions folder is initialised', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list', '--path', dir]
    )
    expect(result.exitCode).toBe(0)
  })

  it('outputs each decision record title', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Event Sourcing' } })
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Postgres' } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list', '--path', dir]
    )
    expect(result.stdout).toContain('Use Event Sourcing')
    expect(result.stdout).toContain('Use Postgres')
  })

  it('outputs each record padded ID', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Event Sourcing' } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list', '--path', dir]
    )
    expect(result.stdout).toContain('001')
  })

  it('outputs each record status', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', status: 'Accepted' },
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list', '--path', dir]
    )
    expect(result.stdout).toContain('Accepted')
  })

  it('succeeds and does not crash when there are no numbered records', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list', '--path', dir]
    )
    expect(result.exitCode).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// --json flag
// ---------------------------------------------------------------------------

describe('decisions list --json', () => {
  it('outputs valid JSON', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Event Sourcing' } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list', '--path', dir, '--json']
    )
    expect(() => JSON.parse(result.stdout)).not.toThrow()
  })

  it('JSON payload has status "success"', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list', '--path', dir, '--json']
    )
    expect(JSON.parse(result.stdout).status).toBe('success')
  })

  it('JSON payload contains a records array with at least one entry after create', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Event Sourcing' } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list', '--path', dir, '--json']
    )
    const records = JSON.parse(result.stdout).data.records
    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBeGreaterThan(0)
  })

  it('each record in the JSON array has id, title, and status fields', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', status: 'Accepted' },
    })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'list', '--path', dir, '--json']
    )
    const record = JSON.parse(result.stdout).data.records[0]
    expect(record).toHaveProperty('id')
    expect(record).toHaveProperty('title')
    expect(record).toHaveProperty('status')
  })

  it('outputs valid JSON on error when not initialised', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'list', '--path', freshDir, '--json']
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

describe('decisions list — errors', () => {
  it('exits with a non-zero code when decisions have not been initialised', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'list', '--path', freshDir]
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
        ['decisions', 'list', '--path', freshDir]
      )
      expect(result.stderr).toContain('NOT_INITIALIZED')
    } finally {
      cleanupDir(freshDir)
    }
  })
})
