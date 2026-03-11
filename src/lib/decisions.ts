import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'

export const VALID_STATUSES = ['Proposed', 'Accepted'] as const
export type ValidStatus = (typeof VALID_STATUSES)[number]

export interface DecisionRecord {
  id: number
  filename: string
  title: string
  slug: string
  date: string
  scope: string
  status: string
  description: string
}

export interface ValidationError {
  file: string
  code: string
  message: string
  fixable: boolean
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
}

export function formatId(num: number): string {
  return String(num).padStart(3, '0')
}

export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const result: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    result[key] = value
  }
  return result
}

export async function getNextId(recordsDir: string): Promise<number> {
  if (!existsSync(recordsDir)) return 1
  const files = await readdir(recordsDir)
  const ids = files
    .filter((f) => /^\d{3}-.*\.md$/.test(f))
    .map((f) => parseInt(f.slice(0, 3), 10))
  return ids.length === 0 ? 1 : Math.max(...ids) + 1
}

export async function readAllRecords(recordsDir: string): Promise<DecisionRecord[]> {
  if (!existsSync(recordsDir)) return []
  const files = (await readdir(recordsDir)).filter((f) => /^\d{3}-.*\.md$/.test(f)).sort()
  const records: DecisionRecord[] = []
  for (const filename of files) {
    const content = await Bun.file(join(recordsDir, filename)).text()
    const fm = parseFrontmatter(content)
    records.push({
      id: parseInt(fm.id ?? '0', 10),
      filename,
      title: fm.title ?? '',
      slug: fm.slug ?? '',
      date: fm.date ?? '',
      scope: fm.scope ?? '',
      status: fm.status ?? '',
      description: fm.description ?? '',
    })
  }
  return records
}

export function validateRecord(filename: string, content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const filenameMatch = filename.match(/^(\d+)-(.+)\.md$/)
  if (!filenameMatch) return []

  const filenameId = parseInt(filenameMatch[1], 10)
  const filenameSlug = filenameMatch[2]
  const fm = parseFrontmatter(content)

  // Check if id is quoted as a string (e.g. id: "1")
  const rawId = fm.id ?? ''
  const isStringId = /^["'].*["']$/.test(rawId)
  const idStripped = rawId.replace(/^["']|["']$/g, '')
  const parsedId = parseInt(idStripped, 10)

  if (isStringId && !isNaN(parsedId)) {
    errors.push({
      file: filename,
      code: 'INVALID_ID_TYPE',
      message: `ID field is a string (${rawId}) but must be a number. Use ${filenameId} without quotes.`,
      fixable: true,
    })
  }

  if (!isNaN(parsedId) && parsedId !== filenameId) {
    errors.push({
      file: filename,
      code: 'ID_MISMATCH',
      message: `ID in frontmatter (${parsedId}) does not match filename (${filenameId}). Use the file path as the source of truth.`,
      fixable: true,
    })
  }

  const slug = fm.slug ?? ''
  if (slug && slug !== filenameSlug) {
    errors.push({
      file: filename,
      code: 'SLUG_MISMATCH',
      message: `Slug in frontmatter ("${slug}") does not match filename slug ("${filenameSlug}"). Use the file path as the source of truth.`,
      fixable: true,
    })
  }

  const status = fm.status ?? ''
  if (status && !(VALID_STATUSES as readonly string[]).includes(status)) {
    errors.push({
      file: filename,
      code: 'INVALID_STATUS',
      message: `Status "${status}" is not one of: ${VALID_STATUSES.join(', ')}.`,
      fixable: false,
    })
  }

  const date = fm.date ?? ''
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push({
      file: filename,
      code: 'INVALID_DATE',
      message: `Date "${date}" does not match expected format YYYY-MM-DD.`,
      fixable: false,
    })
  }

  return errors
}

export async function validateAllRecords(
  recordsDir: string,
  earlyExit = false
): Promise<ValidationError[]> {
  if (!existsSync(recordsDir)) return []

  const files = (await readdir(recordsDir)).filter((f) => /^\d{3}-.*\.md$/.test(f)).sort()

  // Check for duplicate IDs (based on filename prefix)
  const idCounts = new Map<number, string[]>()
  for (const file of files) {
    const id = parseInt(file.slice(0, 3), 10)
    const existing = idCounts.get(id) ?? []
    idCounts.set(id, [...existing, file])
  }

  const errors: ValidationError[] = []

  for (const [, dupes] of idCounts) {
    if (dupes.length > 1) {
      for (const file of dupes) {
        errors.push({
          file,
          code: 'DUPLICATE_ID',
          message: `File shares ID ${parseInt(file.slice(0, 3), 10)} with: ${dupes.filter((f) => f !== file).join(', ')}.`,
          fixable: false,
        })
      }
      if (earlyExit) return errors
    }
  }

  for (const filename of files) {
    const content = await Bun.file(join(recordsDir, filename)).text()
    const fileErrors = validateRecord(filename, content)
    errors.push(...fileErrors)
    if (earlyExit && errors.length > 0) return errors.slice(0, 1)
  }

  return errors
}

export async function fixRecord(
  recordPath: string,
  filename: string,
  errors: ValidationError[]
): Promise<string[]> {
  const fixable = errors.filter((e) => e.fixable)
  if (fixable.length === 0) return []

  const filenameMatch = filename.match(/^(\d+)-(.+)\.md$/)
  if (!filenameMatch) return []

  const filenameId = parseInt(filenameMatch[1], 10)
  const filenameSlug = filenameMatch[2]

  let content = await Bun.file(recordPath).text()
  const fixed: string[] = []
  const appliedFields = new Set<string>()

  for (const error of fixable) {
    if (
      (error.code === 'INVALID_ID_TYPE' || error.code === 'ID_MISMATCH') &&
      !appliedFields.has('id')
    ) {
      content = content.replace(/^id:.*$/m, `id: ${filenameId}`)
      appliedFields.add('id')
      fixed.push(error.code)
    } else if (error.code === 'SLUG_MISMATCH' && !appliedFields.has('slug')) {
      content = content.replace(/^slug:.*$/m, `slug: ${filenameSlug}`)
      appliedFields.add('slug')
      fixed.push(error.code)
    }
  }

  if (fixed.length > 0) {
    await Bun.write(recordPath, content)
  }
  return fixed
}

export function generateDecisionLog(records: DecisionRecord[]): string {
  const header = `# Decision Log

A record of all decisions made in this project. Each entry links to the full ADR.

> DO NOT MANUALLY MODIFY. This file is auto-generated, so any contents will be replaced.

`

  const tableHeader =
    '| ID  | Decision | Scope | Status | Record |\n' +
    '| --- | -------- | ----- | ------ | ------ |\n'

  const rows = records
    .map((r) => {
      const id = formatId(r.id)
      return `| ${id} | ${r.title} | ${r.scope} | ${r.status} | [${r.filename}](records/${r.filename}) |`
    })
    .join('\n')

  return header + tableHeader + rows + '\n'
}
