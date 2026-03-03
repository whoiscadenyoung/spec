import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { spawn } from 'node:child_process'

// GitHub enforces a 256-character limit on issue titles via the web UI and API.
const GITHUB_TITLE_MAX = 256

function runGhCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || 'GitHub CLI command failed'))
      } else {
        resolve(stdout.trim())
      }
    })
  })
}

const createIssueCommand = defineCommand({
  name: 'issue',
  description:
    'Create a GitHub issue and return its number and URL. ' +
    'Requires the gh CLI to be installed and authenticated (`gh auth login`).',
  options: {
    type: option(z.enum(['fix', 'feature']), {
      description:
        'Issue type: "fix" for bug fixes, "feature" for new features, improvements, or refactors. ' +
        'Used as the branch-name prefix in `create spec`.',
      short: 't',
    }),
    title: option(z.string().min(1), {
      description: `Descriptive issue title (max ${GITHUB_TITLE_MAX} characters). Becomes the GitHub issue title.`,
    }),
    body: option(z.string().min(1), {
      description: 'Full feature or bug description. Becomes the GitHub issue body.',
      short: 'b',
    }),
  },
  handler: async ({ flags }) => {
    if (flags.title.length > GITHUB_TITLE_MAX) {
      console.error(
        JSON.stringify({
          error: `Issue title exceeds GitHub's maximum of ${GITHUB_TITLE_MAX} characters (got ${flags.title.length}).`,
          scope: 'validation',
        })
      )
      process.exit(1)
    }

    try {
      const args = ['issue', 'create', '--title', flags.title, '--body', flags.body]
      const issueUrl = await runGhCommand(args)

      // Extract issue number from URL: https://github.com/owner/repo/issues/123
      const issueMatch = issueUrl.match(/\/issues\/(\d+)/)
      const issueNumber = issueMatch ? parseInt(issueMatch[1], 10) : null

      console.log(JSON.stringify({ issueNumber, issueUrl }))
    } catch (error) {
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          scope: 'issue_creation',
        })
      )
      process.exit(1)
    }
  },
})

export default createIssueCommand
