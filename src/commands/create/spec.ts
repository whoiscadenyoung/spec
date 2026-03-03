import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  getRepoRoot,
  createBranch,
  stageFile,
  commitWithMessage,
  pushBranch,
  linkBranchToIssue,
  getCommitSha,
  getRepoUrl,
  commentOnIssue,
} from '../../lib/git.js'
import { resolveTemplate } from '../../lib/paths.js'

// GitHub enforces a 255-byte limit on branch (ref) names.
const GITHUB_BRANCH_MAX_BYTES = 255

// Slug must be lowercase alphanumeric words separated by single hyphens.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

function exitWithError(error: string, scope: string): never {
  console.error(JSON.stringify({ error, scope }))
  process.exit(1)
}

const createSpecCommand = defineCommand({
  name: 'spec',
  description:
    'Create a feature branch, generate a spec.md from the project template, commit it, push the branch, ' +
    'and link the branch to its GitHub issue. Run `create issue` first to obtain the issue number.',
  options: {
    type: option(z.enum(['fix', 'feature']), {
      description:
        'Issue type: "fix" for bug fixes, "feature" for new features, improvements, or refactors. ' +
        'Used as the branch-name prefix (e.g., feature/123-user-auth).',
      short: 't',
    }),
    number: option(z.coerce.number().int().positive(), {
      description:
        'GitHub issue number returned by `create issue`. ' +
        'Included in the branch name and spec directory path (e.g., feature/123-user-auth, specs/123-user-auth/).',
      short: 'n',
    }),
    slug: option(z.string().min(1), {
      description:
        'Concise 2-4 word identifier for the feature, using lowercase letters, numbers, and hyphens ' +
        '(e.g., "user-auth", "analytics-dashboard"). No leading, trailing, or consecutive hyphens.',
      short: 's',
    }),
  },
  handler: async ({ flags }) => {
    // --- Validate slug format ---
    if (!SLUG_PATTERN.test(flags.slug)) {
      exitWithError(
        `Invalid slug "${flags.slug}". Use lowercase letters, numbers, and hyphens only. ` +
          'No leading, trailing, or consecutive hyphens (e.g., "user-auth", "analytics-dashboard").',
        'validation'
      )
    }

    // --- Construct and validate branch name ---
    const featureId = `${flags.number}-${flags.slug}`
    const branchName = `${flags.type}/${featureId}`

    if (Buffer.byteLength(branchName) > GITHUB_BRANCH_MAX_BYTES) {
      exitWithError(
        `Branch name "${branchName}" exceeds GitHub's ${GITHUB_BRANCH_MAX_BYTES}-byte limit ` +
          `(${Buffer.byteLength(branchName)} bytes). Use a shorter slug.`,
        'validation'
      )
    }

    const repoRoot = await getRepoRoot()
    const featureDir = join(repoRoot, 'specs', featureId)
    const specFile = join(featureDir, 'spec.md')

    // --- Create and check out branch ---
    try {
      await createBranch(branchName)
    } catch (error) {
      exitWithError(
        error instanceof Error ? error.message : String(error),
        'branch_creation'
      )
    }

    // --- Generate spec file from template ---
    try {
      await mkdir(featureDir, { recursive: true })

      const template = await resolveTemplate('spec-template.md', repoRoot)
      const content = template
        .replace(/\[FEATURE NAME\]/g, flags.slug)
        .replace(/\[###-feature-name\]/g, branchName)
        .replace(/\[DATE\]/g, new Date().toISOString().split('T')[0])
        .replace(/\$ARGUMENTS/g, flags.slug)

      await Bun.write(specFile, content)
    } catch (error) {
      exitWithError(
        error instanceof Error ? error.message : String(error),
        'template_creation'
      )
    }

    // --- Stage spec file ---
    try {
      await stageFile(specFile)
    } catch (error) {
      exitWithError(
        error instanceof Error ? error.message : String(error),
        'git_staging'
      )
    }

    // --- Commit ---
    let commitSha: string
    try {
      await commitWithMessage(`Create spec for issue #${flags.number}: ${flags.slug}`)
      commitSha = await getCommitSha()
    } catch (error) {
      exitWithError(
        error instanceof Error ? error.message : String(error),
        'git_commit'
      )
    }

    // --- Push branch ---
    try {
      await pushBranch(branchName)
    } catch (error) {
      exitWithError(
        error instanceof Error ? error.message : String(error),
        'git_push'
      )
    }

    // --- Link branch to GitHub issue ---
    try {
      await linkBranchToIssue(flags.number, branchName)
    } catch (error) {
      exitWithError(
        error instanceof Error ? error.message : String(error),
        'issue_link'
      )
    }

    // --- Post comment with permalink(s) to created files ---
    try {
      const repoUrl = await getRepoUrl()

      // Build a permalink for each created file using the exact commit SHA so
      // the link remains stable even if the files change in future commits.
      const createdFiles = [specFile]
      const fileLinks = createdFiles
        .map((absPath) => {
          const relPath = absPath.slice(repoRoot.length + 1)
          const url = `${repoUrl}/blob/${commitSha}/${relPath}`
          return `- [\`${relPath}\`](${url})`
        })
        .join('\n')

      const comment = `Initial feature specification files created.\n\n${fileLinks}`
      await commentOnIssue(flags.number, comment)
    } catch (error) {
      exitWithError(
        error instanceof Error ? error.message : String(error),
        'issue_comment'
      )
    }

    console.log(JSON.stringify({ branchName, specFile, featureDir }))
  },
})

export default createSpecCommand
