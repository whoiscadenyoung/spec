import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { getRepoRoot } from '../../lib/git.js'
import {
  validateAllRecords,
  fixRecord,
  type ValidationError,
} from '../../lib/decisions.js'
import { Errors, handleError, printJsonSuccess } from '../../lib/errors.js'

const validateCommand = defineCommand({
  name: 'validate',
  description:
    'Validate all decision records in docs/decisions/records/. Checks for duplicate IDs, ' +
    'invalid frontmatter values, and mismatches between file names and frontmatter fields. ' +
    'Use --fix to automatically correct fixable errors.',
  options: {
    fix: option(z.boolean().default(false), {
      description: 'Attempt to auto-fix fixable errors (ID/slug mismatches, quoted ID types).',
    }),
    json: option(z.boolean().default(false), {
      description: 'Output results as JSON.',
    }),
    path: option(z.string().optional(), {
      description: 'Override the repository root path (defaults to the git repo root).',
      short: 'p',
    }),
  },
  handler: async ({ flags }) => {
    // exitCode is set inside try and process.exit is called AFTER the try/catch.
    // Never call process.exit() inside a try/catch — it throws an error that gets
    // caught and re-processed by handleError, producing double JSON output.
    let exitCode = 0

    try {
      const repoRoot = flags.path ?? (await getRepoRoot())
      const recordsDir = join(repoRoot, 'docs', 'decisions', 'records')

      if (!existsSync(recordsDir)) {
        throw Errors.NOT_INITIALIZED
      }

      let errors = await validateAllRecords(recordsDir)

      if (flags.fix) {
        // Group errors by file and apply fixes
        const byFile = new Map<string, ValidationError[]>()
        for (const err of errors) {
          const list = byFile.get(err.file) ?? []
          list.push(err)
          byFile.set(err.file, list)
        }

        const fixedCodes: { file: string; codes: string[] }[] = []
        for (const [filename, fileErrors] of byFile) {
          const recordPath = join(recordsDir, filename)
          const fixed = await fixRecord(recordPath, filename, fileErrors)
          if (fixed.length > 0) fixedCodes.push({ file: filename, codes: fixed })
        }

        const totalFixed = fixedCodes.reduce((n, f) => n + f.codes.length, 0)
        errors = await validateAllRecords(recordsDir)

        if (flags.json) {
          if (errors.length === 0) {
            printJsonSuccess({ valid: true, fixed: totalFixed, errors: [] })
          } else {
            console.log(
              JSON.stringify(
                {
                  status: 'error',
                  error: {
                    code: 'VALIDATION_FAILED',
                    message: `Found ${errors.length} validation error(s) that could not be auto-fixed.`,
                    suggestions: ['Run `decisions validate` to review remaining issues.'],
                    fixed: totalFixed,
                    errors: errors.map((e) => ({
                      file: `docs/decisions/records/${e.file}`,
                      code: e.code,
                      message: e.message,
                      fixable: e.fixable,
                    })),
                  },
                },
                null,
                2
              )
            )
            exitCode = 1
          }
        } else {
          if (totalFixed > 0) {
            console.log(`\nFixed ${totalFixed} error(s):\n`)
            for (const { file, codes } of fixedCodes) {
              const filePath = `docs/decisions/records/${file}`
              for (const code of codes) {
                console.log(`  ${filePath}`)
                console.log(`    ✓ [${code}] Updated to match filename.`)
              }
            }
          }

          if (errors.length > 0) {
            console.error(`\n❌ Remaining ${errors.length} unfixable error(s):\n`)
            for (const err of errors) {
              const filePath = `docs/decisions/records/${err.file}`
              console.error(`  ${filePath}`)
              console.error(`    [${err.code}] ${err.message}`)
            }
            console.error()
            exitCode = 1
          } else if (totalFixed > 0) {
            console.log('\n✓ All errors have been fixed.\n')
          } else {
            console.log('\n✓ All decision records are valid.\n')
          }
        }
      } else if (flags.json) {
        if (errors.length === 0) {
          printJsonSuccess({ valid: true, errors: [] })
        } else {
          const fixableCount = errors.filter((e) => e.fixable).length
          const suggestions = ['Run `decisions validate` to review all issues.']
          if (fixableCount > 0) {
            suggestions.unshift(
              `Run \`decisions validate --fix\` to auto-fix ${fixableCount} fixable error(s).`
            )
          }
          console.log(
            JSON.stringify(
              {
                status: 'error',
                error: {
                  code: 'VALIDATION_FAILED',
                  message: `Found ${errors.length} validation error(s) in decision records.`,
                  suggestions,
                  errors: errors.map((e) => ({
                    file: `docs/decisions/records/${e.file}`,
                    code: e.code,
                    message: e.message,
                    fixable: e.fixable,
                  })),
                },
              },
              null,
              2
            )
          )
          exitCode = 1
        }
      } else if (errors.length === 0) {
        console.log('\n✓ All decision records are valid.\n')
      } else {
        const fixableCount = errors.filter((e) => e.fixable).length
        console.error(`\n❌ Found ${errors.length} validation error(s) in decision records:\n`)
        for (const err of errors) {
          const filePath = `docs/decisions/records/${err.file}`
          console.error(`  ${filePath}`)
          console.error(`    [${err.code}] ${err.message}`)
          if (!err.fixable) {
            console.error(`    → Manual fix required.`)
          }
        }
        if (fixableCount > 0) {
          console.error(
            `\nRun \`decisions validate --fix\` to auto-fix ${fixableCount} fixable error(s).`
          )
        }
        console.error()
        exitCode = 1
      }
    } catch (err) {
      handleError(err, flags.json, 'decisions validate')
    }

    if (exitCode !== 0) process.exit(exitCode)
  },
})

export default validateCommand
