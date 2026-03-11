import { defineGroup } from '@bunli/core'
import agentContextCommand from './update/agent-context.js'

const updateGroup = defineGroup({
  name: 'update',
  description: 'Update AI agent context and other feature artifacts',
  commands: [agentContextCommand],
})

export default updateGroup
