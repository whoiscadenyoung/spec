import { defineCommand } from '@bunli/core'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { getRepoRoot, getCurrentBranch, isFeatureBranch } from '../../lib/git.js'
import { getFeaturePaths, findFeatureDirByPrefix, resolveTemplate } from '../../lib/paths.js'

const createPlanCommand = defineCommand({
  name: 'plan',
  description: 'Create a plan.md for the current feature branch',
  options: {},
  handler: async ({ }) => {
    const repoRoot = await getRepoRoot()
    const branch = await getCurrentBranch()

    if (!isFeatureBranch(branch)) {
      console.error(JSON.stringify({ error: `Not on a feature branch (expected NNN-description format): ${branch}` }))
      process.exit(1)
    }

    const paths = getFeaturePaths(repoRoot, branch)

    // Try to find existing feature dir by numeric prefix if branch dir doesn't exist
    const prefix = branch.split('-')[0]
    let featureDir = paths.featureDir
    if (!existsSync(featureDir)) {
      const found = await findFeatureDirByPrefix(paths.specsDir, prefix)
      if (found) {
        featureDir = found
      } else {
        await mkdir(featureDir, { recursive: true })
      }
    }

    const planMd = `${featureDir}/plan.md`

    if (existsSync(planMd)) {
      console.error(JSON.stringify({ error: `plan.md already exists: ${planMd}` }))
      process.exit(1)
    }

    const template = await resolveTemplate('plan-template.md', repoRoot)
    const content = template
      .replace(/\[FEATURE\]/g, branch)
      .replace(/\[###-feature-name\]/g, branch)
      .replace(/\[DATE\]/g, new Date().toISOString().split('T')[0])

    await Bun.write(planMd, content)

    console.log(JSON.stringify({ branch, planFile: planMd, featureDir }))
  },
})

export default createPlanCommand
