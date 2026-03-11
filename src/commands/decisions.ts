import { defineGroup } from '@bunli/core'
import initDecisionsCommand from './decisions/init.js'
import createDecisionCommand from './decisions/create.js'
import syncCommand from './decisions/sync.js'
import listDecisionsCommand from './decisions/list.js'
import listScopesCommand from './decisions/list-scopes.js'

const decisionsGroup = defineGroup({
  name: 'decisions',
  description: 'Manage Architecture Decision Records (ADRs) — initialize the decisions folder, create new records, and keep the decision log up to date',
  commands: [initDecisionsCommand, createDecisionCommand, syncCommand, listDecisionsCommand, listScopesCommand],
})

export default decisionsGroup
