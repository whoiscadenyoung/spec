import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { opendir } from 'node:fs/promises'

export interface FeaturePaths {
  repoRoot: string
  branch: string
  specsDir: string
  featureDir: string
  specMd: string
  planMd: string
  tasksMd: string
}

export function getFeaturePaths(repoRoot: string, branch: string): FeaturePaths {
  const specsDir = join(repoRoot, 'specs')
  const featureDir = join(specsDir, branch)
  return {
    repoRoot,
    branch,
    specsDir,
    featureDir,
    specMd: join(featureDir, 'spec.md'),
    planMd: join(featureDir, 'plan.md'),
    tasksMd: join(featureDir, 'tasks.md'),
  }
}

export async function findFeatureDirByPrefix(
  specsDir: string,
  prefix: string
): Promise<string | null> {
  if (!existsSync(specsDir)) return null
  const dir = await opendir(specsDir)
  for await (const entry of dir) {
    if (entry.isDirectory() && entry.name.startsWith(`${prefix}-`)) {
      return join(specsDir, entry.name)
    }
  }
  return null
}

// Resolves a template: checks target repo first, falls back to bundled templates
export async function resolveTemplate(
  templateName: string,
  repoRoot: string
): Promise<string> {
  const repoTemplate = join(repoRoot, '.specify', 'templates', templateName)
  if (existsSync(repoTemplate)) {
    return Bun.file(repoTemplate).text()
  }

  // Bundled fallback: templates/ relative to this package's root
  const bundledTemplate = join(import.meta.dir, '..', '..', 'templates', templateName)
  if (existsSync(bundledTemplate)) {
    return Bun.file(bundledTemplate).text()
  }

  throw new Error(`Template not found: ${templateName}`)
}
