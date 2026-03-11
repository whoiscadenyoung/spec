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
} from '../../lib/decisions.js'

const VALID_STATUSES = ['Proposed', 'Accepted'] as const

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
  },
  handler: async ({ flags }) => {
    const repoRoot = await getRepoRoot()
    const decisionsDir = join(repoRoot, 'docs', 'decisions')
    const recordsDir = join(decisionsDir, 'records')
    const logPath = join(decisionsDir, 'decision-log.md')

    const slug = slugify(flags.title)
    if (!slug) {
      console.error(`Error: Could not generate a valid slug from title "${flags.title}".`)
      process.exit(1)
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

    const content = template
      .replace(/\{ID\}/g, String(nextId))
      .replace(/\{TITLE\}/g, flags.title)
      .replace(/\{SLUG\}/g, slug)
      .replace(/\{SCOPE\}/g, flags.scope)
      .replace(/\{STATUS\}/g, flags.status)
      .replace(/\{DESCRIPTION\}/g, flags.description)

    await Bun.write(recordPath, content)

    // Update decision log
    const records = await readAllRecords(recordsDir)
    await Bun.write(logPath, generateDecisionLog(records))

    const frontmatter = {
      id: nextId,
      title: flags.title,
      slug,
      scope: flags.scope,
      status: flags.status,
      description: flags.description,
    }

    console.log(`Created: ${recordPath}\n`)
    console.log('Frontmatter:')
    for (const [key, value] of Object.entries(frontmatter)) {
      console.log(`  ${key}: ${value || '(empty)'}`)
    }

    const suggestions: string[] = []
    if (!flags.scope) {
      suggestions.push(
        `  --scope: Add a brief scope (e.g., "Architecture", "Process", "Infrastructure")`
      )
    }
    if (!flags.description) {
      suggestions.push(`  --description: Add a short description summarising the decision`)
    }
    if (suggestions.length > 0) {
      console.log(`\nSuggestions for missing fields:\n${suggestions.join('\n')}`)
    }

    console.log(`\nUpdated: ${logPath}`)
  },
})

export default createDecisionCommand
