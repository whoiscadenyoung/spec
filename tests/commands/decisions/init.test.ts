import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { testCommand, testCLI } from '@bunli/test'
import { createTempDir, cleanupDir } from '../../helpers.js'
import initDecisionsCommand from '../../../src/commands/decisions/init.js'
import decisionsGroup from '../../../src/commands/decisions.js'

let dir: string

beforeEach(() => {
  dir = createTempDir()
})

afterEach(() => {
  cleanupDir(dir)
})

// ---------------------------------------------------------------------------
// Success states
// ---------------------------------------------------------------------------

describe('decisions init — success', () => {
  it('exits with code 0', async () => {
    const result = await testCommand(initDecisionsCommand, { flags: { path: dir } })
    expect(result.exitCode).toBe(0)
  })

  it('creates docs/decisions/ directory', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    expect(existsSync(join(dir, 'docs', 'decisions'))).toBe(true)
  })

  it('creates docs/decisions/records/ sub-directory', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    expect(existsSync(join(dir, 'docs', 'decisions', 'records'))).toBe(true)
  })

  it('creates a non-empty decision-log.md', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const logPath = join(dir, 'docs', 'decisions', 'decision-log.md')
    expect(existsSync(logPath)).toBe(true)
    expect(readFileSync(logPath, 'utf8').length).toBeGreaterThan(0)
  })

  it('creates 000-use-decision-records.md in records/', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const recordPath = join(dir, 'docs', 'decisions', 'records', '000-use-decision-records.md')
    expect(existsSync(recordPath)).toBe(true)
    expect(readFileSync(recordPath, 'utf8').length).toBeGreaterThan(0)
  })

  it('mentions the created files in stdout', async () => {
    const result = await testCommand(initDecisionsCommand, { flags: { path: dir } })
    expect(result.stdout).toContain('decision-log.md')
    expect(result.stdout).toContain('000-use-decision-records.md')
  })
})

// ---------------------------------------------------------------------------
// --json flag
// ---------------------------------------------------------------------------

describe('decisions init --json', () => {
  it('outputs valid JSON on success', async () => {
    const result = await testCommand(initDecisionsCommand, {
      flags: { path: dir, json: true },
    })
    expect(() => JSON.parse(result.stdout)).not.toThrow()
  })

  it('JSON success payload has status "success"', async () => {
    const result = await testCommand(initDecisionsCommand, {
      flags: { path: dir, json: true },
    })
    expect(JSON.parse(result.stdout).status).toBe('success')
  })

  it('JSON success payload lists the created files', async () => {
    const result = await testCommand(initDecisionsCommand, {
      flags: { path: dir, json: true },
    })
    const files: string[] = JSON.parse(result.stdout).data.files
    expect(files.some((f) => f.includes('decision-log.md'))).toBe(true)
    expect(files.some((f) => f.includes('000-use-decision-records.md'))).toBe(true)
  })

  it('outputs valid JSON on error when already initialised', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'init', '--path', dir, '--json']
    )
    expect(() => JSON.parse(result.stdout)).not.toThrow()
    expect(JSON.parse(result.stdout).status).toBe('error')
  })

  it('JSON error payload includes a code and message', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'init', '--path', dir, '--json']
    )
    const json = JSON.parse(result.stdout)
    expect(json.error.code).toBeTruthy()
    expect(json.error.message).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Error states
// ---------------------------------------------------------------------------

describe('decisions init — errors', () => {
  it('exits with a non-zero code when docs/decisions/ already exists', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'init', '--path', dir]
    )
    expect(result.exitCode).not.toBe(0)
  })

  it('reports the ALREADY_EXISTS error when re-initialising without --force', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'init', '--path', dir]
    )
    expect(result.stderr).toContain('ALREADY_EXISTS')
  })
})

// ---------------------------------------------------------------------------
// --force flag
// ---------------------------------------------------------------------------

describe('decisions init --force', () => {
  it('succeeds even when docs/decisions/ already exists', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    const result = await testCommand(initDecisionsCommand, {
      flags: { path: dir, force: true },
    })
    expect(result.exitCode).toBe(0)
  })

  it('recreates the directory structure after a forced re-init', async () => {
    await testCommand(initDecisionsCommand, { flags: { path: dir } })
    await testCommand(initDecisionsCommand, { flags: { path: dir, force: true } })
    expect(existsSync(join(dir, 'docs', 'decisions', 'decision-log.md'))).toBe(true)
    expect(
      existsSync(join(dir, 'docs', 'decisions', 'records', '000-use-decision-records.md'))
    ).toBe(true)
  })
})
