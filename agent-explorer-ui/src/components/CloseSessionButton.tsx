type Props = {
  onClick: () => void
}

// Leaves session mode; the session stays in the list and can be reopened.
export function CloseSessionButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Close the session (it stays in the list)"
      className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      Close session ✕
    </button>
  )
}
