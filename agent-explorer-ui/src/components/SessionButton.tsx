type Props = {
  onClick: () => void
  disabled: boolean
}

export function SessionButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Start a new session: follow-up prompts keep the conversation context"
      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      New Session
    </button>
  )
}
