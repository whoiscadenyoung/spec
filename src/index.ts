#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import specGroup from './commands/spec.js'
import planGroup from './commands/plan.js'
import updateContext from './commands/update-context.js'
import checkRequirements from './commands/check-requirements.js'

const cli = await createCLI({
  name: 'spec',
  version: '0.1.0',
  description: 'Spec-Driven Development CLI',
})

cli.command(specGroup)
cli.command(planGroup)
cli.command(updateContext)
cli.command(checkRequirements)

await cli.run()
