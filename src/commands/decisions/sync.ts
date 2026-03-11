import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { getRepoRoot } from '../../lib/git.js'
import { readAllRecords, generateDecisionLog, validateAllRecords } from '../../lib/decisions.js'
import {
  Errors,
  handleError,
  printJsonSuccess,
} from '../../lib/errors.js'

const syncCommand = defineCommand({
  name: 'sync',
  description:
    'Scan docs/decisions/records/ for all decision records and regenerate docs/decisions/decision-log.md ' +
    'with the correct frontmatter for every record. The log is fully auto-generated and safe to overwrite.',
  options: {
    json: option(z.boolean().default(false), {
      description: 'Output results as JSON',
    }),
    path: option(z.string().optional(), {
      description: 'Override the repository root path (defaults to the git repo root)',
      short: 'p',
    }),
  },
  handler: async ({ flags }) => {
    try {
      const repoRoot = flags.path ?? await getRepoRoot()
      const decisionsDir = join(repoRoot, 'docs', 'decisions')
      const recordsDir = join(decisionsDir, 'records')
      const logPath = join(decisionsDir, 'decision-log.md')

      if (!existsSync(recordsDir)) {
        throw Errors.NOT_INITIALIZED
      }

      const validationErrors = await validateAllRecords(recordsDir, true)
      if (validationErrors.length > 0) {
        throw Errors.VALIDATION_FAILED(validationErrors.length)
      }

      const records = await readAllRecords(recordsDir)
      await Bun.write(logPath, generateDecisionLog(records))

      if (flags.json) {
        printJsonSuccess({
          log: 'docs/decisions/decision-log.md',
          records: records.length,
        })
      } else {
        console.log(`Updated ${logPath} with ${records.length} record(s).`)
        for (const r of records) {
          console.log(`  - ${r.filename}: ${r.title} [${r.status}]`)
        }
      }
    } catch (err) {
      handleError(err, flags.json, 'decisions sync')
    }
  },
})

export default syncCommand
