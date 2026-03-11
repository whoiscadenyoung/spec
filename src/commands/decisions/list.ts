import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { getRepoRoot } from '../../lib/git.js'
import { readAllRecords, formatId, type DecisionRecord } from '../../lib/decisions.js'
import { Errors, handleError, printJsonSuccess } from '../../lib/errors.js'

const listDecisionsCommand = defineCommand({
  name: 'list',
  description:
    'List all decision records from docs/decisions/records/. Supports filtering by scope or ' +
    'status, and an extended --full view that includes all frontmatter fields.',
  options: {
    scope: option(z.string().optional(), {
      description: 'Filter records by scope (case-insensitive).',
      short: 's',
    }),
    status: option(z.string().optional(), {
      description: 'Filter records by status (case-insensitive).',
      short: 'S',
    }),
    full: option(z.boolean().default(false), {
      description: 'Show all frontmatter fields including ID, Date, and Path.',
      short: 'f',
    }),
    json: option(z.boolean().default(false), {
      description: 'Output results as JSON.',
    }),
    path: option(z.string().optional(), {
      description: 'Override the repository root path (defaults to the git repo root).',
      short: 'p',
    }),
  },
  handler: async ({ flags }) => {
    try {
      const repoRoot = flags.path ?? (await getRepoRoot())
      const recordsDir = join(repoRoot, 'docs', 'decisions', 'records')

      if (!existsSync(recordsDir)) {
        throw Errors.NOT_INITIALIZED
      }

      let records = await readAllRecords(recordsDir)

      const scopeFilter = flags.scope?.toLowerCase()
      const statusFilter = flags.status?.toLowerCase()

      if (scopeFilter) {
        records = records.filter((r) => r.scope.toLowerCase() === scopeFilter)
      }
      if (statusFilter) {
        records = records.filter((r) => r.status.toLowerCase() === statusFilter)
      }

      if (flags.json) {
        const filters: Record<string, string> = {}
        if (flags.scope) filters.scope = flags.scope
        if (flags.status) filters.status = flags.status

        const items = records.map((r) => {
          const base = {
            id: formatId(r.id),
            title: r.title,
            path: r.filename,
            scope: r.scope,
            status: r.status,
            description: r.description,
          }
          if (flags.full) {
            return { ...base, date: r.date }
          }
          return base
        })

        const data: Record<string, unknown> = { records: items }
        if (Object.keys(filters).length > 0) data.filters = filters

        printJsonSuccess(data)
      } else {
        printRecords(records, flags.full)
      }
    } catch (err) {
      handleError(err, flags.json, 'decisions list')
    }
  },
})

function printRecords(records: DecisionRecord[], full: boolean): void {
  if (records.length === 0) {
    console.log('No matching records found.')
    return
  }

  console.log(`Found ${records.length} record(s) in docs/decisions/records/\n`)

  for (const r of records) {
    const id = formatId(r.id)
    const scope = r.scope || '(none)'
    const status = r.status || '(unknown)'

    if (full) {
      console.log(`${id}  ${r.title}  [${status}]`)
      console.log(`     Scope: ${scope}`)
      console.log(`     Date:  ${r.date || '(none)'}`)
      if (r.description) console.log(`     Description: ${r.description}`)
      console.log(`     Path:  ${r.filename}`)
    } else {
      console.log(`${id}  ${r.title}  [${status}]`)
      console.log(`     Scope: ${scope}`)
      if (r.description) console.log(`     ${r.description}`)
      console.log(`     Path:  ${r.filename}`)
    }
    console.log()
  }
}

export default listDecisionsCommand
