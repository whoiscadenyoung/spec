#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import createGroup from './commands/create.js'
import updateGroup from './commands/update.js'
import checkRequirements from './commands/check-requirements.js'
import initCommand from './commands/init.js'

const cli = await createCLI({
  name: 'spec',
  version: '0.1.0',
  description: 'Spec-Driven Development CLI',
})

cli.command(initCommand)
cli.command(createGroup)
cli.command(updateGroup)
cli.command(checkRequirements)

await cli.run()
