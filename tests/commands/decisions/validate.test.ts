/**
 * Tests for `decisions validate` — validates decision record frontmatter and
 * filenames, with an optional --fix flag to auto-correct fixable errors.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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

const recordsDir = () => join(dir, 'docs', 'decisions', 'records')

function writeRecord(filename: string, content: string): void {
  writeFileSync(join(recordsDir(), filename), content)
}

function makeContent(
  id: number | string,
  slug: string,
  extra: Partial<Record<string, string>> = {}
): string {
  const fields: Record<string, string> = {
    id: String(id),
    title: 'My Decision',
    slug,
    date: '2024-01-15',
    scope: 'Architecture',
    status: 'Proposed',
    description: 'A test.',
    ...extra,
  }
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return `---\n${fm}\n---\n\nBody.`
}

// ---------------------------------------------------------------------------
// Success states
// ---------------------------------------------------------------------------

describe('decisions validate — success', () => {
  it('exits with code 0 when all records are valid', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Postgres' } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.exitCode).toBe(0)
  })

  it('outputs a success message when all records are valid', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Postgres' } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.stdout).toMatch(/valid/i)
  })

  it('exits with code 0 when the records directory is empty', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.exitCode).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Error states
// ---------------------------------------------------------------------------

describe('decisions validate — errors', () => {
  it('exits with a non-zero code when records have validation errors', async () => {
    writeRecord('001-my-decision.md', makeContent(99, 'my-decision'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.exitCode).not.toBe(0)
  })

  it('reports ID_MISMATCH when frontmatter id does not match filename', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.stderr).toContain('ID_MISMATCH')
  })

  it('reports SLUG_MISMATCH when frontmatter slug does not match filename', async () => {
    writeRecord('001-my-decision.md', makeContent(1, 'wrong-slug'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.stderr).toContain('SLUG_MISMATCH')
  })

  it('reports INVALID_ID_TYPE when id is quoted as a string', async () => {
    writeRecord(
      '001-my-decision.md',
      makeContent('"1"', 'my-decision')
    )
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.stderr).toContain('INVALID_ID_TYPE')
  })

  it('reports INVALID_STATUS when status is not valid', async () => {
    writeRecord('001-my-decision.md', makeContent(1, 'my-decision', { status: 'draft' }))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.stderr).toContain('INVALID_STATUS')
  })

  it('reports INVALID_DATE when date does not match YYYY-MM-DD', async () => {
    writeRecord('001-my-decision.md', makeContent(1, 'my-decision', { date: '15/01/2024' }))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.stderr).toContain('INVALID_DATE')
  })

  it('reports DUPLICATE_ID when two files share the same numeric prefix', async () => {
    writeRecord('001-first.md', makeContent(1, 'first'))
    writeRecord('001-second.md', makeContent(1, 'second'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.stderr).toContain('DUPLICATE_ID')
  })

  it('includes the file path in the error output', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir]
    )
    expect(result.stderr).toContain('001-my-decision.md')
  })

  it('exits with a non-zero code when not initialised', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'validate', '--path', freshDir]
      )
      expect(result.exitCode).not.toBe(0)
    } finally {
      cleanupDir(freshDir)
    }
  })
})

// ---------------------------------------------------------------------------
// --json flag
// ---------------------------------------------------------------------------

describe('decisions validate --json', () => {
  it('outputs valid JSON on success', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Postgres' } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir, '--json']
    )
    expect(() => JSON.parse(result.stdout)).not.toThrow()
    expect(JSON.parse(result.stdout).status).toBe('success')
  })

  it('JSON success payload includes valid=true and errors=[]', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Use Postgres' } })
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir, '--json']
    )
    const payload = JSON.parse(result.stdout)
    expect(payload.data.valid).toBe(true)
    expect(payload.data.errors).toEqual([])
  })

  it('outputs valid JSON on validation failure', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir, '--json']
    )
    expect(() => JSON.parse(result.stdout)).not.toThrow()
    expect(JSON.parse(result.stdout).status).toBe('error')
  })

  it('JSON error payload includes errors array with file, code, message, fixable', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--path', dir, '--json']
    )
    const payload = JSON.parse(result.stdout)
    expect(Array.isArray(payload.error.errors)).toBe(true)
    const err = payload.error.errors[0]
    expect(typeof err.file).toBe('string')
    expect(typeof err.code).toBe('string')
    expect(typeof err.message).toBe('string')
    expect(typeof err.fixable).toBe('boolean')
  })

  it('outputs valid JSON on NOT_INITIALIZED error', async () => {
    const freshDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'validate', '--path', freshDir, '--json']
      )
      expect(() => JSON.parse(result.stdout)).not.toThrow()
      expect(JSON.parse(result.stdout).status).toBe('error')
    } finally {
      cleanupDir(freshDir)
    }
  })
})

// ---------------------------------------------------------------------------
// --fix flag
// ---------------------------------------------------------------------------

describe('decisions validate --fix', () => {
  it('exits with code 0 when all errors are fixed', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir]
    )
    expect(result.exitCode).toBe(0)
  })

  it('corrects ID_MISMATCH in the file', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision'))
    await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir]
    )
    const content = readFileSync(join(recordsDir(), '001-my-decision.md'), 'utf8')
    expect(content).toContain('id: 1')
    expect(content).not.toContain('id: 5')
  })

  it('corrects SLUG_MISMATCH in the file', async () => {
    writeRecord('001-my-decision.md', makeContent(1, 'wrong-slug'))
    await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir]
    )
    const content = readFileSync(join(recordsDir(), '001-my-decision.md'), 'utf8')
    expect(content).toContain('slug: my-decision')
    expect(content).not.toContain('slug: wrong-slug')
  })

  it('corrects INVALID_ID_TYPE by converting quoted id to a number', async () => {
    writeRecord('001-my-decision.md', makeContent('"1"', 'my-decision'))
    await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir]
    )
    const content = readFileSync(join(recordsDir(), '001-my-decision.md'), 'utf8')
    expect(content).toContain('id: 1')
    expect(content).not.toContain('id: "1"')
  })

  it('exits with a non-zero code when unfixable errors remain after --fix', async () => {
    writeRecord('001-my-decision.md', makeContent(1, 'my-decision', { status: 'draft' }))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir]
    )
    expect(result.exitCode).not.toBe(0)
  })

  it('does not modify files with non-fixable errors', async () => {
    const originalContent = makeContent(1, 'my-decision', { status: 'draft' })
    writeRecord('001-my-decision.md', originalContent)
    await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir]
    )
    const content = readFileSync(join(recordsDir(), '001-my-decision.md'), 'utf8')
    expect(content).toContain('status: draft')
  })

  it('reports fixed errors and remaining unfixed errors', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision', { status: 'draft' }))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir]
    )
    const combined = result.stdout + result.stderr
    expect(combined).toMatch(/fix/i)
  })

  it('--fix with --json outputs valid JSON', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir, '--json']
    )
    expect(() => JSON.parse(result.stdout)).not.toThrow()
  })

  it('--fix with --json reports success when all errors are fixed', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir, '--json']
    )
    expect(JSON.parse(result.stdout).status).toBe('success')
  })

  it('--fix with --json includes fixed count in payload', async () => {
    writeRecord('001-my-decision.md', makeContent(5, 'my-decision'))
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'validate', '--fix', '--path', dir, '--json']
    )
    const payload = JSON.parse(result.stdout)
    expect(typeof payload.data.fixed).toBe('number')
    expect(payload.data.fixed).toBeGreaterThan(0)
  })
})
