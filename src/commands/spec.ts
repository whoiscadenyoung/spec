import { defineCommand, defineGroup, option } from '@bunli/core'
import { z } from 'zod'
import { mkdir } from 'node:fs/promises'
import { getRepoRoot, getNextFeatureNumber, createBranch, isFeatureBranch } from '../lib/git.js'
import { getFeaturePaths, resolveTemplate } from '../lib/paths.js'

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'can', 'could', 'add', 'new', 'create',
  'update', 'fix', 'for', 'to', 'in', 'on', 'at', 'by', 'with', 'from',
  'of', 'and', 'or', 'but', 'not', 'this', 'that', 'these', 'those',
])

function descriptionToBranchName(description: string, number: number): string {
  const prefix = String(number).padStart(3, '0')
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w))

  let suffix = words.join('-')

  // Enforce GitHub's 244-byte branch name limit
  const maxSuffixBytes = 244 - prefix.length - 1 // -1 for the hyphen
  if (Buffer.byteLength(suffix) > maxSuffixBytes) {
    // Truncate at word boundary
    const parts = suffix.split('-')
    let truncated = ''
    for (const part of parts) {
      const candidate = truncated ? `${truncated}-${part}` : part
      if (Buffer.byteLength(candidate) > maxSuffixBytes) break
      truncated = candidate
    }
    suffix = truncated || suffix.slice(0, maxSuffixBytes)
  }

  return `${prefix}-${suffix}`
}

const createCommand = defineCommand({
  name: 'create',
  description: 'Create a new feature branch with spec directory',
  options: {
    description: option(z.string(), { description: 'Feature description', short: 'd' }),
    shortName: option(z.string().optional(), { description: 'Override generated branch name suffix' }),
    number: option(z.coerce.number().int().positive().optional(), { description: 'Override feature number' }),
  },
  handler: async ({ flags }) => {
    const repoRoot = await getRepoRoot()
    const featureNumber = flags.number ?? await getNextFeatureNumber(repoRoot)
    const suffix = flags.shortName
      ? flags.shortName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : descriptionToBranchName(flags.description, featureNumber).split('-').slice(1).join('-')

    const prefix = String(featureNumber).padStart(3, '0')
    const branchName = `${prefix}-${suffix}`

    if (!isFeatureBranch(branchName)) {
      console.error(JSON.stringify({ error: `Invalid branch name generated: ${branchName}` }))
      process.exit(1)
    }

    await createBranch(branchName)

    const paths = getFeaturePaths(repoRoot, branchName)
    await mkdir(paths.featureDir, { recursive: true })

    const template = await resolveTemplate('spec-template.md', repoRoot)
    const content = template
      .replace(/\[FEATURE NAME\]/g, flags.description)
      .replace(/\[###-feature-name\]/g, branchName)
      .replace(/\[DATE\]/g, new Date().toISOString().split('T')[0])
      .replace(/\$ARGUMENTS/g, flags.description)

    await Bun.write(paths.specMd, content)

    console.log(JSON.stringify({ branch: branchName, specFile: paths.specMd, featureNumber }))
  },
})

const specGroup = defineGroup({
  name: 'spec',
  description: 'Manage feature specifications',
  commands: [createCommand],
})

export default specGroup
