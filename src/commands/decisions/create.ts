import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { join } from 'node:path'
import { getRepoRoot } from '../../lib/git.js'
import {
  slugify,
  formatId,
  getNextId,
  readAllRecords,
  generateDecisionLog,
  VALID_STATUSES,
} from '../../lib/decisions.js'
import {
  Errors,
  handleError,
  printJsonSuccess,
} from '../../lib/errors.js'

const createDecisionCommand = defineCommand({
  name: 'create',
  description:
    'Create a new decision record from the built-in template. Automatically assigns the next ' +
    'sequential ID, slugifies the title for the filename, and updates docs/decisions/decision-log.md.',
  options: {
    title: option(z.string().min(1), {
      description:
        'Title of the decision record in natural language (e.g., "Use Decision Records"). Required.',
      short: 't',
    }),
    scope: option(z.string().default(''), {
      description:
        'Brief word or phrase describing the scope of the decision (e.g., "Architecture", "Process"). ' +
        'Defaults to empty.',
      short: 's',
    }),
    description: option(z.string().default(''), {
      description: 'Short description summarising what was decided. Defaults to empty.',
      short: 'd',
    }),
    status: option(z.enum(VALID_STATUSES).default('Proposed'), {
      description: 'Status of the decision record: "Proposed" or "Accepted". Defaults to Proposed.',
      short: 'S',
    }),
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

      const slug = slugify(flags.title)
      if (!slug) {
        throw Errors.INVALID_TITLE(flags.title)
      }

      const nextId = await getNextId(recordsDir)
      const paddedId = formatId(nextId)
      const filename = `${paddedId}-${slug}.md`
      const recordPath = join(recordsDir, filename)

      const templatePath = join(
        import.meta.dir,
        '..',
        '..',
        '..',
        'templates',
        'decisions',
        'records',
        'record-template.md'
      )
      const template = await Bun.file(templatePath).text()

      const scope = flags.scope ?? ''
      const status = flags.status ?? 'Proposed'
      const description = flags.description ?? ''

      const date = new Date().toISOString().slice(0, 10)

      const content = template
        .replace(/\{ID\}/g, String(nextId))
        .replace(/\{TITLE\}/g, flags.title)
        .replace(/\{SLUG\}/g, slug)
        .replace(/\{DATE\}/g, date)
        .replace(/\{SCOPE\}/g, scope)
        .replace(/\{STATUS\}/g, status)
        .replace(/\{DESCRIPTION\}/g, description)

      await Bun.write(recordPath, content)

      const records = await readAllRecords(recordsDir)
      await Bun.write(logPath, generateDecisionLog(records))

      const frontmatter = {
        id: nextId,
        title: flags.title,
        slug,
        scope,
        status,
        description,
      }

      if (flags.json) {
        const nextSteps: string[] = []
        if (!scope) nextSteps.push('Add a scope with --scope (e.g., "Architecture")')
        if (!description) nextSteps.push('Add a description with --description')
        printJsonSuccess(
          {
            record: `docs/decisions/records/${filename}`,
            log: 'docs/decisions/decision-log.md',
            frontmatter,
          },
          nextSteps
        )
      } else {
        console.log(`Created: ${recordPath}\n`)
        console.log('Frontmatter:')
        for (const [key, value] of Object.entries(frontmatter)) {
          console.log(`  ${key}: ${value || '(empty)'}`)
        }

        const suggestions: string[] = []
        if (!scope) {
          suggestions.push(
            `  --scope: Add a brief scope (e.g., "Architecture", "Process", "Infrastructure")`
          )
        }
        if (!description) {
          suggestions.push(`  --description: Add a short description summarising the decision`)
        }
        if (suggestions.length > 0) {
          console.log(`\nSuggestions for missing fields:\n${suggestions.join('\n')}`)
        }

        console.log(`\nUpdated: ${logPath}`)
      }
    } catch (err) {
      handleError(err, flags.json, 'decisions create')
    }
  },
})

export default createDecisionCommand
