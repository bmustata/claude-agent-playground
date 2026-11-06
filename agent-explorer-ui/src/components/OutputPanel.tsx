import type { QueryResult } from '../lib/api'
import { AnswerBody } from './AnswerBody'

function MetaPill({ label, tooltip, warning }: { label: string; tooltip?: string; warning?: boolean }) {
  const colors = warning
    ? 'bg-slate-100 text-amber-700 dark:bg-slate-800 dark:text-amber-300'
    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
  return (
    <span className={`group relative rounded-full px-2 py-0.5 text-xs ${colors}${tooltip ? ' cursor-help' : ''}`}>
      {label}
      {tooltip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden whitespace-nowrap rounded-md bg-slate-600 px-2 py-1 text-xs text-white shadow-lg group-hover:block dark:bg-slate-300 dark:text-slate-900"
        >
          {tooltip}
        </span>
      )}
    </span>
  )
}

// Metadata fields the backend may leave out of the /query response.
const OPTIONAL_FIELDS = ['model', 'duration', 'rounds', 'toolsUsed', 'usage'] as const

function getMissingFields(result: QueryResult): string[] {
  return OPTIONAL_FIELDS.filter((field) => result[field] === undefined)
}

// Formats a duration in milliseconds as a human-readable string (ms/s/m/h).
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`

  const totalSeconds = ms / 1000
  if (totalSeconds < 60) return `${totalSeconds.toFixed(totalSeconds < 10 ? 1 : 0)}s`

  const totalMinutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  if (totalMinutes < 60) return seconds ? `${totalMinutes}m ${seconds}s` : `${totalMinutes}m`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

type Props = {
  isLoading: boolean
  error: string | null
  result: QueryResult | null
  markdownOn: boolean
}

export function OutputPanel({ isLoading, error, result, markdownOn }: Props) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Output</span>
      <div className="min-h-40 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        {isLoading && <p className="text-slate-400 dark:text-slate-500">Thinking…</p>}

        {!isLoading && error && <p className="whitespace-pre-wrap text-red-600 dark:text-red-400">{error}</p>}

        {!isLoading && !error && !result && (
          <p className="text-slate-400 dark:text-slate-500">Send a prompt to see the agent's response here.</p>
        )}

        {!isLoading && !error && result && (
          <AnswerBody answer={result.answer} markdownOn={markdownOn} />
        )}
      </div>

      {!isLoading && !error && result && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.model && <MetaPill label={`🤖 ${result.model}`} />}
          {result.duration !== undefined && <MetaPill label={`⏱️ ${formatDuration(result.duration)}`} />}
          {result.rounds !== undefined && (
            <MetaPill label={`🔁 ${result.rounds} round${result.rounds === 1 ? '' : 's'}`} />
          )}
          {result.toolsUsed?.map((tool) => (
            <MetaPill key={tool} label={`🔧 ${tool}`} />
          ))}
          {result.usage && (
            <MetaPill
              label={`🔢 ${result.usage.inputTokens}↑ ${result.usage.outputTokens}↓ tokens  📖 ${result.usage.cacheReadTokens}  📝 ${result.usage.cacheWriteTokens}`}
            />
          )}
          {getMissingFields(result).length > 0 && (
            <MetaPill
              warning
              label={`⚠️ ${getMissingFields(result).length} field${getMissingFields(result).length === 1 ? '' : 's'} missing`}
              tooltip={`Missing from response: ${getMissingFields(result).join(', ')}`}
            />
          )}
        </div>
      )}
    </div>
  )
}
