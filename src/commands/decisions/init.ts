import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { existsSync } from 'node:fs'
import { mkdir, rm, copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getRepoRoot } from '../../lib/git.js'
import {
  Errors,
  handleError,
  printJsonSuccess,
} from '../../lib/errors.js'

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
    json: option(z.boolean().default(false), {
      description: 'Output results as JSON',
    }),
  },
  handler: async ({ flags }) => {
    try {
      const repoRoot = await getRepoRoot()
      const decisionsDir = join(repoRoot, 'docs', 'decisions')
      const recordsDir = join(decisionsDir, 'records')

      if (existsSync(decisionsDir)) {
        if (!flags.force) {
          throw Errors.ALREADY_EXISTS
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

      const files = [
        'docs/decisions/decision-log.md',
        'docs/decisions/records/000-use-decision-records.md',
      ]
      const nextSteps = ['Run `decisions create` to create your first decision record.']

      if (flags.json) {
        printJsonSuccess(
          { message: 'Initialized docs/decisions/ successfully.', files },
          nextSteps
        )
      } else {
        console.log(
          `Initialized docs/decisions/ successfully.\n` +
            `  - ${files[0]}\n` +
            `  - ${files[1]}\n\n` +
            nextSteps[0]
        )
      }
    } catch (err) {
      handleError(err, flags.json, 'decisions init')
    }
  },
})

export default initDecisionsCommand
