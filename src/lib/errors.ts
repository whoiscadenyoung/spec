export class SpecError extends Error {
  readonly code: string
  readonly suggestions: string[]

  constructor(code: string, message: string, suggestions: string[] = []) {
    super(message)
    this.name = 'SpecError'
    this.code = code
    this.suggestions = suggestions
  }
}

export const Errors = {
  ALREADY_EXISTS: new SpecError(
    'ALREADY_EXISTS',
    'A docs/decisions/ folder already exists in this location.',
    ['Retry the command with the --force flag to replace the contents.']
  ),

  INVALID_TITLE: (title: string) =>
    new SpecError(
      'INVALID_TITLE',
      `Could not generate a valid slug from title "${title}".`,
      ['Use a title with at least one alphanumeric character.']
    ),

  NOT_INITIALIZED: new SpecError(
    'NOT_INITIALIZED',
    'docs/decisions/records/ not found.',
    ['Run `decisions init` first to initialize the decisions folder.']
  ),

  NOT_GIT_REPO: new SpecError(
    'NOT_GIT_REPO',
    'Not inside a git repository.',
    ['Run this command from within a git repository.']
  ),

  unknown: (err: unknown) =>
    new SpecError('UNKNOWN', err instanceof Error ? err.message : String(err)),
}

export function toSpecError(err: unknown): SpecError {
  if (err instanceof SpecError) return err
  if (err instanceof Error && err.message.toLowerCase().includes('git repository')) {
    return Errors.NOT_GIT_REPO
  }
  return Errors.unknown(err)
}

export function printError(command: string, error: SpecError): void {
  console.error(`\n❌ "${command}" failed: ${error.code}\n`)
  console.error(`   ${error.message}`)
  if (error.suggestions.length > 0) {
    console.error('\n   Suggestions')
    if (error.suggestions.length === 1) {
      console.error(`   ${error.suggestions[0]}`)
    } else {
      error.suggestions.forEach((s, i) => {
        console.error(`   ${i + 1}. ${s}`)
      })
    }
  }
  console.error()
}

export function printJsonError(error: SpecError): void {
  console.log(
    JSON.stringify(
      {
        status: 'error',
        error: {
          code: error.code,
          message: error.message,
          suggestions: error.suggestions,
        },
      },
      null,
      2
    )
  )
}

export function printJsonSuccess(
  data: Record<string, unknown>,
  nextSteps: string[] = []
): void {
  console.log(JSON.stringify({ status: 'success', data, nextSteps }, null, 2))
}

export function handleError(err: unknown, json: boolean, command: string): never {
  const specErr = toSpecError(err)
  if (json) {
    printJsonError(specErr)
  } else {
    printError(command, specErr)
  }
  process.exit(1)
}
