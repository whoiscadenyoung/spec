import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { spawn } from 'node:child_process'

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
        reject(new Error(`GitHub CLI failed: ${stderr}`))
      } else {
        resolve(stdout.trim())
      }
    })
  })
}

const createIssueCommand = defineCommand({
  name: 'create-issue',
  description: 'Create a GitHub issue',
  options: {
    title: option(
      z.string(),
      { description: 'Issue title', short: 't' }
    ),
    body: option(
      z.string(),
      { description: 'Issue body', short: 'b' }
    ),
  },
  handler: async ({ flags }) => {
    try {
      const args = ['issue', 'create', '--title', flags.title, '--body', flags.body]
      const issueUrl = await runGhCommand(args)

      // Extract issue number from URL (e.g., https://github.com/owner/repo/issues/123 -> 123)
      const issueMatch = issueUrl.match(/\/issues\/(\d+)/)
      const issueNumber = issueMatch ? parseInt(issueMatch[1], 10) : null

      console.log(JSON.stringify({ issueNumber, issueUrl }))
    } catch (error) {
      console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      process.exit(1)
    }
  },
})

export default createIssueCommand
