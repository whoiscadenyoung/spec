import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { testCommand, testCLI } from '@bunli/test'
import { createTempDir, cleanupDir } from '../../helpers.js'
import initDecisionsCommand from '../../../src/commands/decisions/init.js'
import createDecisionCommand from '../../../src/commands/decisions/create.js'
import syncCommand from '../../../src/commands/decisions/sync.js'
import decisionsGroup from '../../../src/commands/decisions.js'

let dir: string

beforeEach(async () => {
  dir = createTempDir()
  await testCommand(initDecisionsCommand, { flags: { path: dir } })
})

afterEach(() => {
  cleanupDir(dir)
})

const logPath = () => join(dir, 'docs', 'decisions', 'decision-log.md')
const recordsDir = () => join(dir, 'docs', 'decisions', 'records')

// ---------------------------------------------------------------------------
// Success states
// ---------------------------------------------------------------------------

describe('decisions sync — success', () => {
  it('exits with code 0 after initialisation', async () => {
    const result = await testCommand(syncCommand, { flags: { path: dir } })
    expect(result.exitCode).toBe(0)
  })

  it('regenerates decision-log.md with all record titles', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Event Sourcing' } })
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Postgres' } })

    writeFileSync(logPath(), '# Stale log')

    await testCommand(syncCommand, { flags: { path: dir } })
    const log = readFileSync(logPath(), 'utf8')
    expect(log).toContain('Use Event Sourcing')
    expect(log).toContain('Use Postgres')
  })

  it('reflects frontmatter changes made directly to a record file', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Event Sourcing' } })

    const recordFile = join(recordsDir(), '001-use-event-sourcing.md')
    const original = readFileSync(recordFile, 'utf8')
    writeFileSync(recordFile, original.replace('status: Proposed', 'status: Accepted'))

    await testCommand(syncCommand, { flags: { path: dir } })
    expect(readFileSync(logPath(), 'utf8')).toContain('Accepted')
  })

  it('reports the number of records synced in stdout', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'First Decision' } })
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Second Decision' } })
    const result = await testCommand(syncCommand, { flags: { path: dir } })
    expect(result.stdout).toContain('2')
  })
})

// ---------------------------------------------------------------------------
// --json flag
// ---------------------------------------------------------------------------

describe('decisions sync --json', () => {
  it('outputs valid JSON on success', async () => {
    const result = await testCommand(syncCommand, { flags: { path: dir, json: true } })
    expect(() => JSON.parse(result.stdout)).not.toThrow()
  })

  it('JSON success payload has status "success"', async () => {
    const result = await testCommand(syncCommand, { flags: { path: dir, json: true } })
    expect(JSON.parse(result.stdout).status).toBe('success')
  })

  it('JSON success payload includes the log path', async () => {
    const result = await testCommand(syncCommand, { flags: { path: dir, json: true } })
    expect(JSON.parse(result.stdout).data.log).toContain('decision-log.md')
  })

  it('JSON success payload includes a record count', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'First Decision' } })
    const result = await testCommand(syncCommand, { flags: { path: dir, json: true } })
    const { records } = JSON.parse(result.stdout).data
    expect(typeof records).toBe('number')
    expect(records).toBeGreaterThanOrEqual(1)
  })

  it('outputs valid JSON on error when not initialised', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'sync', '--path', freshDir, '--json']
      )
      expect(() => JSON.parse(result.stdout)).not.toThrow()
      expect(JSON.parse(result.stdout).status).toBe('error')
    } finally {
      cleanupDir(freshDir)
    }
  })

  it('JSON error payload includes a code and message', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'sync', '--path', freshDir, '--json']
      )
      const json = JSON.parse(result.stdout)
      expect(json.error.code).toBeTruthy()
      expect(json.error.message).toBeTruthy()
    } finally {
      cleanupDir(freshDir)
    }
  })
})

// ---------------------------------------------------------------------------
// Error states
// ---------------------------------------------------------------------------

describe('decisions sync — errors', () => {
  it('exits with a non-zero code when decisions have not been initialised', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'sync', '--path', freshDir]
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
        ['decisions', 'sync', '--path', freshDir]
      )
      expect(result.stderr).toContain('NOT_INITIALIZED')
    } finally {
      cleanupDir(freshDir)
    }
  })
})
