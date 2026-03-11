import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { existsSync } from 'node:fs'
import { mkdir, rm, copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getRepoRoot } from '../../lib/git.js'

const initDecisionsCommand = defineCommand({
  name: 'init',
  description:
    'Initialize the decisions folder structure in the current repository, copying the decision log ' +
    'and the first decision record from the built-in templates. Use --force to overwrite an existing ' +
    'docs/decisions/ folder.',
  options: {
    force: option(z.boolean().default(false), {
      description: 'Overwrite the existing docs/decisions/ folder if it already exists',
      short: 'f',
    }),
  },
  handler: async ({ flags }) => {
    const repoRoot = await getRepoRoot()
    const decisionsDir = join(repoRoot, 'docs', 'decisions')
    const recordsDir = join(decisionsDir, 'records')

    if (existsSync(decisionsDir)) {
      if (!flags.force) {
        console.error(
          `Error: docs/decisions/ already exists. Use --force to replace its contents.`
        )
        process.exit(1)
      }
      await rm(decisionsDir, { recursive: true, force: true })
    }

    await mkdir(join(repoRoot, 'docs'), { recursive: true })
    await mkdir(decisionsDir, { recursive: true })
    await mkdir(recordsDir, { recursive: true })

    const templateRoot = join(import.meta.dir, '..', '..', '..', 'templates', 'decisions')

    await copyFile(
      join(templateRoot, 'decision-log.md'),
      join(decisionsDir, 'decision-log.md')
    )
    await copyFile(
      join(templateRoot, 'records', '000-use-decision-records.md'),
      join(recordsDir, '000-use-decision-records.md')
    )

    console.log(
      `Initialized docs/decisions/ successfully.\n` +
        `  - docs/decisions/decision-log.md\n` +
        `  - docs/decisions/records/000-use-decision-records.md\n\n` +
        `Run \`decisions create\` to create your first decision record.`
    )
  },
})

export default initDecisionsCommand
