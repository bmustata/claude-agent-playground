import type { Session } from '../lib/api'

type Props = {
  sessions: Session[]
  activeSessionId: string | null
  onSelect: (session: Session) => void
  onDelete: (session: Session) => void
}

export function SessionList({ sessions, activeSessionId, onSelect, onDelete }: Props) {
  return (
    <nav aria-label="Sessions">
      <h2 className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">Sessions</h2>
      <ul className="max-h-64 space-y-1 overflow-y-auto xl:max-h-[calc(100vh-14rem)]">
        {sessions.map((session) => {
          const active = session.id === activeSessionId
          return (
            <li
              key={session.id}
              className={`group flex items-center rounded-lg border text-sm ${
                active
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(session)}
                title={`${session.name ?? 'New session'}\nID: ${session.id}`}
                aria-current={active ? 'true' : undefined}
                className="min-w-0 flex-1 truncate px-3 py-2 text-left"
              >
                {session.name ?? <span className="italic opacity-70">New session</span>}
              </button>
              <span
                title={`${session.queryCount} ${session.queryCount === 1 ? 'query' : 'queries'}`}
                className="ml-1 shrink-0 rounded-full bg-slate-200 px-1.5 text-xs tabular-nums text-slate-600 dark:bg-slate-600 dark:text-slate-200"
              >
                {session.queryCount}
              </span>
              <button
                type="button"
                onClick={() => onDelete(session)}
                aria-label={`Delete session ${session.name ?? 'New session'}`}
                title="Delete session"
                className="mr-1 rounded px-1.5 py-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
