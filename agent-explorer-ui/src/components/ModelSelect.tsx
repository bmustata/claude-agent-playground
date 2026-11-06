type Props = {
  model: string
  options: string[]
  onChange: (model: string) => void
}

export function ModelSelect({ model, options, onChange }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor="model-select" className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">
        Model
      </label>
      <select
        id="model-select"
        value={model}
        onChange={(event) => onChange(event.target.value)}
        className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        {options.length === 0 && <option value="">Default (server-configured)</option>}
        {options.map((option, index) => (
          <option key={option} value={option}>
            {option}
            {index === 0 ? ' (default)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
