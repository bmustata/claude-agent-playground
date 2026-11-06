type Props = {
  label: string
  active: boolean
  onToggle: () => void
}

export function PillToggle({ label, active, onToggle }: Props) {
  const activeClass = 'bg-white text-[#4338ca]'
  const inactiveClass = 'border border-white/30 text-white hover:bg-white/15'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active ? activeClass : inactiveClass}`}
    >
      {label} {active ? 'On' : 'Off'}
    </button>
  )
}
