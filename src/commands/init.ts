import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { existsSync } from 'node:fs'
import { mkdir, readdir, copyFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { getRepoRoot } from '../lib/git.js'

function deepMerge(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...existing }
  for (const [key, value] of Object.entries(incoming)) {
    if (
      key in result &&
      typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key]) &&
      typeof value === 'object' && value !== null && !Array.isArray(value)
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      )
    } else if (!(key in result)) {
      result[key] = value
    }
  }
  return result
}

const initCommand = defineCommand({
  name: 'init',
  description: 'Set up Spec Kit in the current repository',
  options: {
    ai: option(
      z.enum(['copilot']),
      { description: 'AI agent to configure', short: 'a' }
    ),
    force: option(
      z.boolean().default(false),
      { description: 'Overwrite existing prompt files', short: 'f' }
    ),
  },
  handler: async ({ flags }) => {
    const repoRoot = await getRepoRoot()
    const templateRoot = join(import.meta.dir, '..', '..', 'templates')

    // Step 1: Copy .github/prompts/*.prompt.md files
    const promptsSrcDir = join(templateRoot, '.github', 'prompts')
    const promptsDstDir = join(repoRoot, '.github', 'prompts')

    await mkdir(promptsDstDir, { recursive: true })

    const promptFiles = await readdir(promptsSrcDir)
    const copied: string[] = []
    const skipped: string[] = []

    for (const file of promptFiles) {
      const src = join(promptsSrcDir, file)
      const dst = join(promptsDstDir, file)

      if (existsSync(dst) && !flags.force) {
        skipped.push(file)
      } else {
        await copyFile(src, dst)
        copied.push(file)
      }
    }

    // Step 2: Merge .vscode/settings.json
    const vscodeSrc = join(templateRoot, '.vscode', 'settings.json')
    const vscodeDst = join(repoRoot, '.vscode', 'settings.json')

    const incoming = JSON.parse(await Bun.file(vscodeSrc).text()) as Record<string, unknown>
    let existing: Record<string, unknown> = {}
    if (existsSync(vscodeDst)) {
      existing = JSON.parse(await Bun.file(vscodeDst).text()) as Record<string, unknown>
    }

    const merged = deepMerge(existing, incoming)
    await mkdir(dirname(vscodeDst), { recursive: true })
    await Bun.write(vscodeDst, JSON.stringify(merged, null, 2) + '\n')

    console.log(JSON.stringify({
      promptsCopied: copied,
      promptsSkipped: skipped,
      vscodeSettingsUpdated: vscodeDst,
    }))
  },
})

export default initCommand
