import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { getRepoRoot, getCurrentBranch, isFeatureBranch } from '../lib/git.js'
import { getFeaturePaths } from '../lib/paths.js'

interface AgentConfig {
  name: string
  filePath: string
  format: 'markdown' | 'mdc'
}

const AGENTS: AgentConfig[] = [
  { name: 'claude', filePath: 'CLAUDE.md', format: 'markdown' },
  { name: 'gemini', filePath: 'GEMINI.md', format: 'markdown' },
  { name: 'codex', filePath: 'AGENTS.md', format: 'markdown' },
  { name: 'amp', filePath: 'AMP.md', format: 'markdown' },
  { name: 'copilot', filePath: '.github/copilot-instructions.md', format: 'markdown' },
  { name: 'cursor', filePath: '.cursor/rules/spec-context.mdc', format: 'mdc' },
  { name: 'windsurf', filePath: '.windsurfrules', format: 'markdown' },
]

interface TechContext {
  language: string
  dependencies: string
  storage: string
  projectType: string
}

function parsePlanContext(planContent: string): TechContext {
  const extract = (label: string) => {
    const match = planContent.match(new RegExp(`\\*\\*${label}\\*\\*:\\s*(.+)`))
    return match ? match[1].trim() : 'NEEDS CLARIFICATION'
  }
  return {
    language: extract('Language/Version'),
    dependencies: extract('Primary Dependencies'),
    storage: extract('Storage'),
    projectType: extract('Project Type'),
  }
}

function buildContextBlock(branch: string, tech: TechContext): string {
  return [
    `<!-- spec-context:start -->`,
    `## Active Feature`,
    ``,
    `**Branch**: \`${branch}\``,
    `**Language**: ${tech.language}`,
    `**Dependencies**: ${tech.dependencies}`,
    `**Storage**: ${tech.storage}`,
    `**Project Type**: ${tech.projectType}`,
    ``,
    `**Spec files**: \`specs/${branch}/\``,
    `<!-- spec-context:end -->`,
  ].join('\n')
}

async function updateAgentFile(
  agentPath: string,
  contextBlock: string
): Promise<void> {
  await mkdir(dirname(agentPath), { recursive: true })

  if (existsSync(agentPath)) {
    let content = await Bun.file(agentPath).text()
    if (content.includes('<!-- spec-context:start -->')) {
      // Replace existing block
      content = content.replace(
        /<!-- spec-context:start -->[\s\S]*?<!-- spec-context:end -->/,
        contextBlock
      )
    } else {
      // Append block
      content = `${content.trimEnd()}\n\n${contextBlock}\n`
    }
    await Bun.write(agentPath, content)
  } else {
    await Bun.write(agentPath, `${contextBlock}\n`)
  }
}

const updateContext = defineCommand({
  name: 'update-context',
  description: 'Update AI agent context files with current feature info',
  options: {
    agent: option(
      z.string().optional(),
      { description: `Agent to update (${AGENTS.map(a => a.name).join(', ')}). Omit to update all detected.`, short: 'a' }
    ),
  },
  handler: async ({ flags }) => {
    const repoRoot = await getRepoRoot()
    const branch = await getCurrentBranch()

    if (!isFeatureBranch(branch)) {
      console.error(JSON.stringify({ error: `Not on a feature branch (expected NNN-description format): ${branch}` }))
      process.exit(1)
    }

    const paths = getFeaturePaths(repoRoot, branch)

    if (!existsSync(paths.planMd)) {
      console.error(JSON.stringify({ error: `plan.md not found — run: spec plan create` }))
      process.exit(1)
    }

    const planContent = await Bun.file(paths.planMd).text()
    const tech = parsePlanContext(planContent)
    const contextBlock = buildContextBlock(branch, tech)

    // Determine which agents to update
    let targets: AgentConfig[]
    if (flags.agent) {
      const target = AGENTS.find(a => a.name === flags.agent)
      if (!target) {
        console.error(JSON.stringify({ error: `Unknown agent: ${flags.agent}. Available: ${AGENTS.map(a => a.name).join(', ')}` }))
        process.exit(1)
      }
      targets = [target]
    } else {
      // Update all agents whose files already exist in the repo
      targets = AGENTS.filter(a => existsSync(join(repoRoot, a.filePath)))
      if (targets.length === 0) {
        console.log(JSON.stringify({ updated: [], message: 'No agent files found. Use --agent <name> to create one.' }))
        return
      }
    }

    const updated: string[] = []
    for (const agent of targets) {
      const agentPath = join(repoRoot, agent.filePath)
      await updateAgentFile(agentPath, contextBlock)
      updated.push(agent.filePath)
    }

    console.log(JSON.stringify({ updated }))
  },
})

export default updateContext
