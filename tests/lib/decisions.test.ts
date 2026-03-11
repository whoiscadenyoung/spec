import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  slugify,
  formatId,
  parseFrontmatter,
  getNextId,
  readAllRecords,
  generateDecisionLog,
  validateRecord,
  validateAllRecords,
  VALID_STATUSES,
} from '../../src/lib/decisions.js'

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe('slugify', () => {
  it('converts a natural-language title to a kebab-case slug', () => {
    expect(slugify('Use Event Sourcing')).toBe('use-event-sourcing')
  })

  it('handles a title that is already slugified', () => {
    expect(slugify('use-event-sourcing')).toBe('use-event-sourcing')
  })

  it('strips special characters', () => {
    expect(slugify('Use ADR (Architecture Decision Records)!')).toBe(
      'use-adr-architecture-decision-records'
    )
  })

  it('collapses multiple consecutive spaces into a single hyphen', () => {
    expect(slugify('Use  Multiple   Spaces')).toBe('use-multiple-spaces')
  })

  it('collapses mixed spaces and hyphens into a single hyphen', () => {
    expect(slugify('Use - Mixed - Separators')).toBe('use-mixed-separators')
  })

  it('trims leading and trailing whitespace', () => {
    expect(slugify('  hello world  ')).toBe('hello-world')
  })

  it('returns an empty string for input with no alphanumeric characters', () => {
    expect(slugify('!!! ???')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// formatId
// ---------------------------------------------------------------------------

describe('formatId', () => {
  it('pads a single-digit number to 3 characters', () => {
    expect(formatId(1)).toBe('001')
  })

  it('pads a two-digit number to 3 characters', () => {
    expect(formatId(42)).toBe('042')
  })

  it('leaves a three-digit number unchanged', () => {
    expect(formatId(100)).toBe('100')
  })

  it('handles numbers greater than 999 without truncation', () => {
    expect(formatId(1000)).toBe('1000')
  })
})

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe('parseFrontmatter', () => {
  it('parses all key-value pairs from valid frontmatter', () => {
    const content = `---\ntitle: My Decision\nstatus: Accepted\nscope: Architecture\n---\n\nBody text`
    const result = parseFrontmatter(content)
    expect(result.title).toBe('My Decision')
    expect(result.status).toBe('Accepted')
    expect(result.scope).toBe('Architecture')
  })

  it('returns an empty object when no frontmatter delimiters are present', () => {
    expect(parseFrontmatter('No frontmatter here')).toEqual({})
  })

  it('returns an empty object when the closing --- is missing', () => {
    expect(parseFrontmatter('---\ntitle: Oops\n')).toEqual({})
  })

  it('preserves colons that appear within a value', () => {
    const content = `---\ntitle: Use http: A Protocol\n---\n`
    expect(parseFrontmatter(content).title).toBe('Use http: A Protocol')
  })

  it('ignores lines that contain no colon separator', () => {
    const content = `---\ntitle: Valid\njust-a-bare-key\n---\n`
    const result = parseFrontmatter(content)
    expect(result.title).toBe('Valid')
    expect(result['just-a-bare-key']).toBeUndefined()
  })

  it('returns an empty object for an empty frontmatter block', () => {
    expect(parseFrontmatter('---\n---\n')).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// getNextId
// ---------------------------------------------------------------------------

describe('getNextId', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'spec-decisions-'))
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns 1 when the directory does not exist', async () => {
    expect(await getNextId('/tmp/__nonexistent_spec_dir__')).toBe(1)
  })

  it('returns 1 for an empty directory', async () => {
    const dir = mkdtempSync(join(tmpDir, 'empty-'))
    expect(await getNextId(dir)).toBe(1)
  })

  it('returns max ID + 1 for sequential record files', async () => {
    const dir = mkdtempSync(join(tmpDir, 'seq-'))
    writeFileSync(join(dir, '001-first.md'), '')
    writeFileSync(join(dir, '002-second.md'), '')
    writeFileSync(join(dir, '003-third.md'), '')
    expect(await getNextId(dir)).toBe(4)
  })

  it('returns max ID + 1 when files are out of order', async () => {
    const dir = mkdtempSync(join(tmpDir, 'ooo-'))
    writeFileSync(join(dir, '005-fifth.md'), '')
    writeFileSync(join(dir, '001-first.md'), '')
    writeFileSync(join(dir, '010-tenth.md'), '')
    expect(await getNextId(dir)).toBe(11)
  })

  it('ignores files that do not match the NNN-*.md pattern', async () => {
    const dir = mkdtempSync(join(tmpDir, 'mixed-'))
    writeFileSync(join(dir, '001-valid.md'), '')
    writeFileSync(join(dir, 'README.md'), '')
    writeFileSync(join(dir, 'invalid-format.md'), '')
    writeFileSync(join(dir, 'ab1-wrong.md'), '')
    expect(await getNextId(dir)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// readAllRecords
// ---------------------------------------------------------------------------

describe('readAllRecords', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'spec-records-'))
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  const makeFrontmatter = (id: number, title: string, status = 'Proposed') =>
    `---\nid: ${id}\ntitle: ${title}\nslug: ${slugify(title)}\ndate: 2024-01-01\nscope: Architecture\nstatus: ${status}\ndescription: A test record.\n---\n\nBody.`

  it('returns an empty array when the directory does not exist', async () => {
    expect(await readAllRecords('/tmp/__nonexistent_spec_dir__')).toEqual([])
  })

  it('returns an empty array when no files match the naming pattern', async () => {
    const dir = mkdtempSync(join(tmpDir, 'empty-'))
    writeFileSync(join(dir, 'README.md'), 'Not a record')
    expect(await readAllRecords(dir)).toEqual([])
  })

  it('reads and correctly parses valid decision records', async () => {
    const dir = mkdtempSync(join(tmpDir, 'valid-'))
    writeFileSync(join(dir, '001-use-adrs.md'), makeFrontmatter(1, 'Use ADRs'))
    writeFileSync(join(dir, '002-use-postgres.md'), makeFrontmatter(2, 'Use Postgres', 'Accepted'))
    const records = await readAllRecords(dir)
    expect(records).toHaveLength(2)
    expect(records[0].id).toBe(1)
    expect(records[0].title).toBe('Use ADRs')
    expect(records[0].status).toBe('Proposed')
    expect(records[1].title).toBe('Use Postgres')
    expect(records[1].status).toBe('Accepted')
  })

  it('returns records sorted alphabetically by filename', async () => {
    const dir = mkdtempSync(join(tmpDir, 'sort-'))
    writeFileSync(join(dir, '003-third.md'), makeFrontmatter(3, 'Third'))
    writeFileSync(join(dir, '001-first.md'), makeFrontmatter(1, 'First'))
    writeFileSync(join(dir, '002-second.md'), makeFrontmatter(2, 'Second'))
    const records = await readAllRecords(dir)
    expect(records.map((r) => r.id)).toEqual([1, 2, 3])
  })

  it('skips files that do not match the NNN-*.md naming pattern', async () => {
    const dir = mkdtempSync(join(tmpDir, 'skip-'))
    writeFileSync(join(dir, '001-valid.md'), makeFrontmatter(1, 'Valid'))
    writeFileSync(join(dir, 'invalid.md'), 'Not a record')
    writeFileSync(join(dir, 'no-id-record.md'), 'Also not a record')
    const records = await readAllRecords(dir)
    expect(records).toHaveLength(1)
    expect(records[0].title).toBe('Valid')
  })

  it('uses empty strings for missing frontmatter fields', async () => {
    const dir = mkdtempSync(join(tmpDir, 'partial-'))
    writeFileSync(join(dir, '001-partial.md'), '---\ntitle: Partial\n---\n')
    const records = await readAllRecords(dir)
    expect(records).toHaveLength(1)
    expect(records[0].title).toBe('Partial')
    expect(records[0].scope).toBe('')
    expect(records[0].status).toBe('')
    expect(records[0].description).toBe('')
  })
})

// ---------------------------------------------------------------------------
// generateDecisionLog
// ---------------------------------------------------------------------------

describe('generateDecisionLog', () => {
  it('generates a markdown table with a header and one row per record', () => {
    const records = [
      {
        id: 1,
        filename: '001-use-adrs.md',
        title: 'Use ADRs',
        slug: 'use-adrs',
        scope: 'Process',
        status: 'Accepted',
        description: '',
      },
      {
        id: 2,
        filename: '002-use-postgres.md',
        title: 'Use Postgres',
        slug: 'use-postgres',
        scope: 'Architecture',
        status: 'Proposed',
        description: '',
      },
    ]
    const log = generateDecisionLog(records)
    expect(log).toContain('# Decision Log')
    expect(log).toContain('| ID  | Decision |')
    expect(log).toContain('| 001 | Use ADRs | Process | Accepted |')
    expect(log).toContain('| 002 | Use Postgres | Architecture | Proposed |')
    expect(log).toContain('[001-use-adrs.md](records/001-use-adrs.md)')
  })

  it('includes the auto-generation warning', () => {
    const log = generateDecisionLog([])
    expect(log).toContain('DO NOT MANUALLY MODIFY')
  })

  it('produces a valid table header even when there are no records', () => {
    const log = generateDecisionLog([])
    expect(log).toContain('| ID  | Decision |')
    const dataRows = log
      .split('\n')
      .filter((l) => l.startsWith('| ') && !l.startsWith('| ID') && !l.startsWith('| ---'))
    expect(dataRows).toHaveLength(0)
  })
})
