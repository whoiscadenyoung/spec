import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { testCommand, testCLI } from '@bunli/test'
import { createTempDir, cleanupDir } from '../../helpers.js'
import initDecisionsCommand from '../../../src/commands/decisions/init.js'
import statusCommand from '../../../src/commands/decisions/status.js'
import decisionsGroup from '../../../src/commands/decisions.js'

let dir: string

beforeEach(async () => {
  dir = createTempDir()
})

afterEach(() => {
  cleanupDir(dir)
})

// ---------------------------------------------------------------------------
// Initialized
// ---------------------------------------------------------------------------

describe('decisions status — initialized', () => {
  it('exits with code 0 when initialized', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const result = await testCommand(statusCommand, { flags: { path: dir } })
    expect(result.exitCode).toBe(0)
  })

  it('prints "ready" in output when initialized', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const result = await testCommand(statusCommand, { flags: { path: dir } })
    expect(result.stdout.toLowerCase()).toContain('ready')
  })

  it('outputs JSON with status "success" when initialized and --json is passed', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const result = await testCommand(statusCommand, { flags: { path: dir, json: true } })
    expect(() => JSON.parse(result.stdout)).not.toThrow()
    expect(JSON.parse(result.stdout).status).toBe('success')
  })
})

// ---------------------------------------------------------------------------
// Not initialized
// ---------------------------------------------------------------------------

describe('decisions status — not initialized', () => {
  it('exits with a non-zero code when not initialized', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'status', '--path', dir]
    )
    expect(result.exitCode).not.toBe(0)
  })

  it('prints NOT_INITIALIZED in output when not initialized', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'status', '--path', dir]
    )
    expect(result.stderr).toContain('NOT_INITIALIZED')
  })

  it('outputs JSON with error code NOT_INITIALIZED when not initialized and --json is passed', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'status', '--path', dir, '--json']
    )
    expect(() => JSON.parse(result.stdout)).not.toThrow()
    expect(JSON.parse(result.stdout).error.code).toBe('NOT_INITIALIZED')
  })
})
