import { parse } from 'yaml'
import agentsYaml from '../../agents.yml?raw'

export type Agent = {
  id: string
  name: string
  description?: string
  baseUrl: string
  defaultModel: string
}

type AgentsFile = { agents: Agent[] }

const { agents } = parse(agentsYaml) as AgentsFile

export function getAgents(): Agent[] {
  return agents
}
