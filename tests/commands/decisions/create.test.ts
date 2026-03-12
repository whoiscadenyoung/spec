import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
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
const logPath = () => join(dir, 'docs', 'decisions', 'decision-log.md')

// ---------------------------------------------------------------------------
// Success states
// ---------------------------------------------------------------------------

describe('decisions create — success', () => {
  it('exits with code 0 when a title is provided', async () => {
    const result = await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing' },
    })
    expect(result.exitCode).toBe(0)
  })

  it('creates a record file with the correct ID-slug filename', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing' },
    })
    expect(existsSync(join(recordsDir(), '001-use-event-sourcing.md'))).toBe(true)
  })

  it('populates the id frontmatter field correctly', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing' },
    })
    const content = readFileSync(join(recordsDir(), '001-use-event-sourcing.md'), 'utf8')
    expect(content).toContain('id: 1')
  })

  it('populates the title frontmatter field correctly', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing' },
    })
    const content = readFileSync(join(recordsDir(), '001-use-event-sourcing.md'), 'utf8')
    expect(content).toContain('title: Use Event Sourcing')
  })

  it('populates the slug frontmatter field correctly', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing' },
    })
    const content = readFileSync(join(recordsDir(), '001-use-event-sourcing.md'), 'utf8')
    expect(content).toContain('slug: use-event-sourcing')
  })

  it('defaults status to Proposed', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing' },
    })
    const content = readFileSync(join(recordsDir(), '001-use-event-sourcing.md'), 'utf8')
    expect(content).toContain('status: Proposed')
  })

  it('updates decision-log.md after creating a record', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing' },
    })
    expect(readFileSync(logPath(), 'utf8')).toContain('Use Event Sourcing')
  })

  it('auto-increments the ID for each new record', async () => {
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'First Decision' } })
    await testCommand(createDecisionCommand, { flags: { path: dir, title: 'Second Decision' } })
    const numbered = readdirSync(recordsDir())
      .filter((f) => /^\d{3}-/.test(f))
      .sort()
    expect(numbered).toContain('001-first-decision.md')
    expect(numbered).toContain('002-second-decision.md')
  })
})

// ---------------------------------------------------------------------------
// Flag behaviour
// ---------------------------------------------------------------------------

describe('decisions create — flags', () => {
  it('--scope populates the scope frontmatter field', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', scope: 'Architecture' },
    })
    const content = readFileSync(join(recordsDir(), '001-use-postgres.md'), 'utf8')
    expect(content).toContain('scope: Architecture')
  })

  it('--description populates the description frontmatter field', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', description: 'Chosen for reliability' },
    })
    const content = readFileSync(join(recordsDir(), '001-use-postgres.md'), 'utf8')
    expect(content).toContain('description: Chosen for reliability')
  })

  it('--status Accepted populates the status frontmatter field', async () => {
    await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Postgres', status: 'Accepted' },
    })
    const content = readFileSync(join(recordsDir(), '001-use-postgres.md'), 'utf8')
    expect(content).toContain('status: Accepted')
  })

  it('all flags together produce correct frontmatter', async () => {
    await testCommand(createDecisionCommand, {
      flags: {
        path: dir,
        title: 'Use Postgres',
        scope: 'Infrastructure',
        description: 'Primary data store',
        status: 'Accepted',
      },
    })
    const content = readFileSync(join(recordsDir(), '001-use-postgres.md'), 'utf8')
    expect(content).toContain('scope: Infrastructure')
    expect(content).toContain('description: Primary data store')
    expect(content).toContain('status: Accepted')
  })
})

// ---------------------------------------------------------------------------
// --json flag
// ---------------------------------------------------------------------------

describe('decisions create --json', () => {
  it('outputs valid JSON on success', async () => {
    const result = await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', json: true },
    })
    expect(() => JSON.parse(result.stdout)).not.toThrow()
  })

  it('JSON success payload has status "success"', async () => {
    const result = await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', json: true },
    })
    expect(JSON.parse(result.stdout).status).toBe('success')
  })

  it('JSON success payload includes the created record path', async () => {
    const result = await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', json: true },
    })
    expect(JSON.parse(result.stdout).data.record).toContain('001-use-event-sourcing.md')
  })

  it('JSON success payload includes frontmatter fields', async () => {
    const result = await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', json: true },
    })
    const { frontmatter } = JSON.parse(result.stdout).data
    expect(frontmatter.title).toBe('Use Event Sourcing')
    expect(frontmatter.slug).toBe('use-event-sourcing')
    expect(frontmatter.status).toBe('Proposed')
  })

  it('suggests adding --scope when scope is omitted', async () => {
    const result = await testCommand(createDecisionCommand, {
      flags: { path: dir, title: 'Use Event Sourcing', json: true },
    })
    const steps: string[] = JSON.parse(result.stdout).nextSteps
    expect(steps.some((s) => s.toLowerCase().includes('scope'))).toBe(true)
  })

  it('outputs valid JSON on error when the title produces an empty slug', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'create', '--path', dir, '--title', '!!! ???', '--json']
    )
    expect(() => JSON.parse(result.stdout)).not.toThrow()
    expect(JSON.parse(result.stdout).status).toBe('error')
  })
})

// ---------------------------------------------------------------------------
// Error states
// ---------------------------------------------------------------------------

describe('decisions create — errors', () => {
  it('exits with a non-zero code when the title produces an empty slug', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'create', '--path', dir, '--title', '!!! ???']
    )
    expect(result.exitCode).not.toBe(0)
  })

  it('reports INVALID_TITLE when the title cannot be slugified', async () => {
    const result = await testCLI(
      (cli) => cli.command(decisionsGroup),
      ['decisions', 'create', '--path', dir, '--title', '!!! ???']
    )
    expect(result.stderr).toContain('INVALID_TITLE')
  })

  it('exits with a non-zero code when decisions have not been initialized', async () => {
    const uninitDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'create', '--path', uninitDir, '--title', 'Some Decision']
      )
      expect(result.exitCode).not.toBe(0)
    } finally {
      cleanupDir(uninitDir)
    }
  })

  it('reports NOT_INITIALIZED when decisions have not been initialized', async () => {
    const uninitDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'create', '--path', uninitDir, '--title', 'Some Decision']
      )
      expect(result.stderr).toContain('NOT_INITIALIZED')
    } finally {
      cleanupDir(uninitDir)
    }
  })

  it('outputs JSON error with NOT_INITIALIZED when not initialized and --json is passed', async () => {
    const uninitDir = createTempDir()
    try {
      const result = await testCLI(
        (cli) => cli.command(decisionsGroup),
        ['decisions', 'create', '--path', uninitDir, '--title', 'Some Decision', '--json']
      )
      expect(() => JSON.parse(result.stdout)).not.toThrow()
      expect(JSON.parse(result.stdout).error.code).toBe('NOT_INITIALIZED')
    } finally {
      cleanupDir(uninitDir)
    }
  })
})
