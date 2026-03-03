import { defineGroup } from '@bunli/core'
import createIssueCommand from './create/issue.js'
import createSpecCommand from './create/spec.js'

const createGroup = defineGroup({
  name: 'create',
  description: 'Create GitHub issues and feature branches with spec files',
  commands: [createIssueCommand, createSpecCommand],
})

export default createGroup
