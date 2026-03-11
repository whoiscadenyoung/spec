import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * Creates a temporary directory in the OS temp folder.
 * No git initialisation is needed because commands accept --path to bypass
 * getRepoRoot().
 */
export function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'spec-test-'))
}

/**
 * Removes a temporary directory created by createTempDir.
 */
export function cleanupDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}
