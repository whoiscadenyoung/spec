import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { getRepoRoot } from '../../lib/git.js'
import { Errors, handleError, printJsonSuccess } from '../../lib/errors.js'

const statusCommand = defineCommand({
  name: 'status',
  description: 'Check whether the decisions folder has been initialized.',
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
      const repoRoot = flags.path ?? await getRepoRoot()
      const recordsDir = join(repoRoot, 'docs', 'decisions', 'records')

      if (!existsSync(recordsDir)) {
        throw Errors.NOT_INITIALIZED
      }

      if (flags.json) {
        printJsonSuccess({ initialized: true }, ['Use `decisions create` to add a new record.'])
      } else {
        console.log('Ready — use `decisions create` to add a new record.')
      }
    } catch (err) {
      handleError(err, flags.json, 'decisions status')
    }
  },
})

export default statusCommand
