import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { getRepoRoot, getCurrentBranch, isFeatureBranch } from '../lib/git.js'
import { getFeaturePaths } from '../lib/paths.js'

const checkRequirements = defineCommand({
  name: 'check-requirements',
  description: 'Validate feature documentation prerequisites',
  options: {
    json: option(z.boolean().default(false), { description: 'Output as JSON', short: 'j' }),
    requireTasks: option(z.boolean().default(false), { description: 'Require tasks.md to exist' }),
    pathsOnly: option(z.boolean().default(false), { description: 'Print path variables without validation' }),
  },
  handler: async ({ flags, colors }) => {
    const repoRoot = await getRepoRoot()
    const branch = await getCurrentBranch()

    if (!isFeatureBranch(branch)) {
      console.error(colors.red(`Not on a feature branch (expected NNN-description format): ${branch}`))
      process.exit(1)
    }

    const paths = getFeaturePaths(repoRoot, branch)

    if (flags.pathsOnly) {
      if (flags.json) {
        console.log(JSON.stringify({
          REPO_ROOT: paths.repoRoot,
          BRANCH: paths.branch,
          FEATURE_DIR: paths.featureDir,
          FEATURE_SPEC: paths.specMd,
          IMPL_PLAN: paths.planMd,
          TASKS: paths.tasksMd,
        }))
      } else {
        console.log(`REPO_ROOT=${paths.repoRoot}`)
        console.log(`BRANCH=${paths.branch}`)
        console.log(`FEATURE_DIR=${paths.featureDir}`)
        console.log(`FEATURE_SPEC=${paths.specMd}`)
        console.log(`IMPL_PLAN=${paths.planMd}`)
        console.log(`TASKS=${paths.tasksMd}`)
      }
      return
    }

    // Validate required files
    const errors: string[] = []

    if (!existsSync(paths.featureDir)) {
      errors.push(`Feature directory not found: ${paths.featureDir}`)
    }

    if (!existsSync(paths.planMd)) {
      errors.push(`plan.md not found — run: spec plan create`)
    }

    if (flags.requireTasks && !existsSync(paths.tasksMd)) {
      errors.push(`tasks.md not found (required)`)
    }

    if (errors.length > 0) {
      if (flags.json) {
        console.log(JSON.stringify({ ok: false, errors }))
      } else {
        for (const e of errors) console.error(colors.red(`✗ ${e}`))
      }
      process.exit(1)
    }

    // Catalog available docs
    const availableDocs: string[] = []
    const docChecks: Array<{ name: string; path: string }> = [
      { name: 'spec.md', path: paths.specMd },
      { name: 'plan.md', path: paths.planMd },
      { name: 'research.md', path: join(paths.featureDir, 'research.md') },
      { name: 'data-model.md', path: join(paths.featureDir, 'data-model.md') },
      { name: 'quickstart.md', path: join(paths.featureDir, 'quickstart.md') },
      { name: 'tasks.md', path: paths.tasksMd },
      { name: 'contracts/', path: join(paths.featureDir, 'contracts') },
    ]

    for (const doc of docChecks) {
      if (existsSync(doc.path)) availableDocs.push(doc.name)
    }

    if (flags.json) {
      console.log(JSON.stringify({ ok: true, featureDir: paths.featureDir, availableDocs }))
    } else {
      console.log(`Feature: ${paths.branch}`)
      console.log(`Directory: ${paths.featureDir}`)
      console.log()
      for (const doc of docChecks) {
        const exists = existsSync(doc.path)
        const icon = exists ? colors.green('✓') : '○'
        console.log(`  ${icon} ${doc.name}`)
      }
    }
  },
})

export default checkRequirements
