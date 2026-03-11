import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'

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
