import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { getRepoRoot } from '../../lib/git.js'
import { readAllRecords } from '../../lib/decisions.js'
import { Errors, handleError, printJsonSuccess } from '../../lib/errors.js'

const listScopesCommand = defineCommand({
  name: 'list-scopes',
  description:
    'List all unique scopes used across decision records, with a count of records per scope.',
  options: {
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

      const records = await readAllRecords(recordsDir)

      // Tally scopes, excluding empty strings
      const counts = new Map<string, number>()
      for (const r of records) {
        if (!r.scope) continue
        counts.set(r.scope, (counts.get(r.scope) ?? 0) + 1)
      }

      const scopes = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([scope, count]) => ({ scope, count }))

      if (flags.json) {
        printJsonSuccess({ scopes })
      } else {
        printScopes(scopes)
      }
    } catch (err) {
      handleError(err, flags.json, 'decisions list-scopes')
    }
  },
})

function printScopes(scopes: Array<{ scope: string; count: number }>): void {
  if (scopes.length === 0) {
    console.log('No scopes found.')
    return
  }

  const maxScopeLen = Math.max(...scopes.map((s) => s.scope.length))
  const header = `${'Scope'.padEnd(maxScopeLen)}  Count`
  const divider = '─'.repeat(maxScopeLen) + '  ' + '─────'

  console.log(header)
  console.log(divider)
  for (const { scope, count } of scopes) {
    console.log(`${scope.padEnd(maxScopeLen)}  ${count}`)
  }
}

export default listScopesCommand
