import { useEffect, useRef, useState } from 'react'
import { CloseSessionButton } from './CloseSessionButton'
import { StatusBadge } from './StatusBadge'
import type { Agent } from '../lib/agents'

type Props = {
  agents: Agent[]
  activeAgentId: string
  health: 'checking' | 'online' | 'offline'
  onSelect: (agent: Agent) => void
  sessionId?: string // set while a session is active
  onCloseSession: () => void
}

export function AgentBar({ agents, activeAgentId, health, onSelect, sessionId, onCloseSession }: Props) {
  const [infoAgentId, setInfoAgentId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Closes the info popover when clicking anywhere outside the agent bar.
  useEffect(() => {
    if (!infoAgentId) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setInfoAgentId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [infoAgentId])

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-2 dark:border-slate-700 dark:bg-slate-900/50"
    >
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Agents</span>
      <div className="flex flex-wrap gap-2">
        {agents.map((agent) => {
          const active = agent.id === activeAgentId
          const infoOpen = infoAgentId === agent.id
          return (
            <div key={agent.id} className="relative">
              <div
                className={`flex items-center gap-1 rounded-lg py-1 pl-3 pr-1 text-sm font-medium shadow-sm transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 text-slate-600 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(agent)}
                  title={agent.description ?? agent.name}
                  className="flex items-center gap-1.5"
                >
                  {agent.name}
                  {active && <StatusBadge status={health} />}
                </button>
                <button
                  type="button"
                  onClick={() => setInfoAgentId(infoOpen ? null : agent.id)}
                  aria-label={`${agent.name} info`}
                  className={`rounded px-1 leading-none transition-colors ${
                    active ? 'hover:bg-white/20' : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  ⚙️
                </button>
              </div>

              {infoOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <dl className="space-y-1.5">
                    <div>
                      <dt className="font-semibold text-slate-500 dark:text-slate-400">Name</dt>
                      <dd className="text-slate-800 dark:text-slate-100">{agent.name}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500 dark:text-slate-400">Description</dt>
                      <dd className="text-slate-800 dark:text-slate-100">{agent.description ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500 dark:text-slate-400">Base URL</dt>
                      <dd className="break-all text-slate-800 dark:text-slate-100">{agent.baseUrl}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500 dark:text-slate-400">Default model</dt>
                      <dd className="text-slate-800 dark:text-slate-100">{agent.defaultModel}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {sessionId && (
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <span title="Session id" className="min-w-0 select-all truncate font-mono text-xs text-slate-500 dark:text-slate-400">
            {sessionId}
          </span>
          <CloseSessionButton onClick={onCloseSession} />
        </div>
      )}
    </div>
  )
}
