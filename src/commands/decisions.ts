import { defineGroup } from '@bunli/core'
import initDecisionsCommand from './decisions/init.js'
import createDecisionCommand from './decisions/create.js'
import updateLogCommand from './decisions/update-log.js'

const decisionsGroup = defineGroup({
  name: 'decisions',
  description: 'Manage Architecture Decision Records (ADRs) — initialize the decisions folder, create new records, and keep the decision log up to date',
  commands: [initDecisionsCommand, createDecisionCommand, updateLogCommand],
})

export default decisionsGroup
