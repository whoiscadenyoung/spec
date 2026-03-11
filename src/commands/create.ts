import { defineGroup } from '@bunli/core'
import createIssueCommand from './create/issue.js'
import createSpecCommand from './create/spec.js'
import createPlanCommand from './create/plan.js'

const createGroup = defineGroup({
  name: 'create',
  description: 'Create GitHub issues, feature branches, specs, and plans',
  commands: [createIssueCommand, createSpecCommand, createPlanCommand],
})

export default createGroup
