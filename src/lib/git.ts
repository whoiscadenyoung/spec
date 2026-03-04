import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'

export async function getRepoRoot(): Promise<string> {
  try {
    const result = await Bun.$`git rev-parse --show-toplevel`.quiet()
    return result.stdout.toString().trim()
  } catch {
    // Fallback: walk up from cwd looking for .git
    let dir = process.cwd()
    while (true) {
      if (existsSync(join(dir, '.git')) || existsSync(join(dir, '.specify'))) {
        return dir
      }
      const parent = dirname(dir)
      if (parent === dir) throw new Error('Not inside a git repository')
      dir = parent
    }
  }
}

export async function getCurrentBranch(): Promise<string> {
  // Check env var first
  if (process.env.SPECIFY_FEATURE) return process.env.SPECIFY_FEATURE

  try {
    const result = await Bun.$`git rev-parse --abbrev-ref HEAD`.quiet()
    const branch = result.stdout.toString().trim()
    if (branch && branch !== 'HEAD') return branch
  } catch {}

  // Fallback: scan specs/ for highest-numbered dir
  const repoRoot = await getRepoRoot()
  const specsDir = join(repoRoot, 'specs')
  if (existsSync(specsDir)) {
    const entries = await readdir(specsDir, { withFileTypes: true })
    const numbered = entries
      .filter(e => e.isDirectory() && /^\d{3}-/.test(e.name))
      .map(e => e.name)
      .sort()
    if (numbered.length > 0) return numbered[numbered.length - 1]
  }

  throw new Error('Could not determine current branch')
}

export async function hasGit(): Promise<boolean> {
  try {
    await Bun.$`git --version`.quiet()
    return true
  } catch {
    return false
  }
}

export function isFeatureBranch(branch: string): boolean {
  return /^\d{3}-.+/.test(branch)
}

export async function createBranch(name: string): Promise<void> {
  await Bun.$`git checkout -b ${name}`.quiet()
}

export async function stageFile(filePath: string): Promise<void> {
  await Bun.$`git add ${filePath}`.quiet()
}

export async function commitWithMessage(message: string): Promise<void> {
  await Bun.$`git commit -m ${message}`.quiet()
}

export async function pushBranch(branchName: string): Promise<void> {
  await Bun.$`git push -u origin ${branchName}`.quiet()
}

export async function linkBranchToIssue(issueNumber: number, branchName: string): Promise<void> {
  await Bun.$`gh issue develop ${issueNumber} --name ${branchName}`.quiet()
}

export async function getCommitSha(): Promise<string> {
  const result = await Bun.$`git rev-parse HEAD`.quiet()
  return result.stdout.toString().trim()
}

export async function getRepoUrl(): Promise<string> {
  const result = await Bun.$`gh repo view --json url -q .url`.quiet()
  return result.stdout.toString().trim()
}

export async function commentOnIssue(issueNumber: number, body: string): Promise<void> {
  await Bun.$`gh issue comment ${issueNumber} --body ${body}`.quiet()
}

export async function getExistingBranches(): Promise<string[]> {
  const branches: string[] = []
  try {
    const local = await Bun.$`git branch --list`.quiet()
    for (const line of local.stdout.toString().split('\n')) {
      const b = line.replace(/^\*?\s+/, '').trim()
      if (b) branches.push(b)
    }
  } catch {}
  try {
    const remote = await Bun.$`git branch -r`.quiet()
    for (const line of remote.stdout.toString().split('\n')) {
      const b = line.trim().replace(/^origin\//, '')
      if (b && !b.includes('->')) branches.push(b)
    }
  } catch {}
  return branches
}

export async function getNextFeatureNumber(repoRoot: string): Promise<number> {
  const used = new Set<number>()

  // Check git branches
  const branches = await getExistingBranches()
  for (const b of branches) {
    const m = b.match(/^(\d{3})-/)
    if (m) used.add(parseInt(m[1], 10))
  }

  // Check specs directory
  const specsDir = join(repoRoot, 'specs')
  if (existsSync(specsDir)) {
    const entries = await readdir(specsDir, { withFileTypes: true })
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const m = e.name.match(/^(\d{3})-/)
      if (m) used.add(parseInt(m[1], 10))
    }
  }

  let n = 1
  while (used.has(n)) n++
  return n
}
