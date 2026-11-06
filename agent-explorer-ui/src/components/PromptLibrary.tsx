import type { SavedPrompt } from '../lib/usePromptLibrary'

type Props = {
  prompts: SavedPrompt[]
  onPick: (prompt: SavedPrompt) => void
  onDelete: (prompt: SavedPrompt) => void
}

export function PromptLibrary({ prompts, onPick, onDelete }: Props) {
  return (
    <section aria-label="Prompt library">
      <h2 className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">Prompt library</h2>
      {prompts.length === 0 ? (
        <p className="text-xs italic text-slate-400">No saved prompts yet. Use “Save to Library” under the chat box.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {prompts.map((prompt) => (
            <li
              key={prompt.id}
              className="flex items-center rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <button
                type="button"
                onClick={() => onPick(prompt)}
                title={prompt.text}
                className="min-w-0 flex-1 truncate px-3 py-2 text-left"
              >
                {prompt.text}
              </button>
              <button
                type="button"
                onClick={() => onDelete(prompt)}
                aria-label="Delete saved prompt"
                title="Delete prompt"
                className="mr-1 rounded px-1.5 py-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
