import { defineCommand } from '@bunli/core'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { getRepoRoot } from '../../lib/git.js'
import { readAllRecords, generateDecisionLog } from '../../lib/decisions.js'

const updateLogCommand = defineCommand({
  name: 'update-log',
  description:
    'Scan docs/decisions/records/ for all decision records and regenerate docs/decisions/decision-log.md ' +
    'with the correct frontmatter for every record. The log is fully auto-generated and safe to overwrite.',
  options: {},
  handler: async () => {
    const repoRoot = await getRepoRoot()
    const decisionsDir = join(repoRoot, 'docs', 'decisions')
    const recordsDir = join(decisionsDir, 'records')
    const logPath = join(decisionsDir, 'decision-log.md')

    if (!existsSync(recordsDir)) {
      console.error(
        `Error: docs/decisions/records/ not found. Run \`decisions init\` first.`
      )
      process.exit(1)
    }

    const records = await readAllRecords(recordsDir)
    await Bun.write(logPath, generateDecisionLog(records))

    console.log(`Updated ${logPath} with ${records.length} record(s).`)
    for (const r of records) {
      console.log(`  - ${r.filename}: ${r.title} [${r.status}]`)
    }
  },
})

export default updateLogCommand
