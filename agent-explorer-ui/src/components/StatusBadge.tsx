type Props = {
  status: 'checking' | 'online' | 'offline'
}

const DOT_CLASS: Record<Props['status'], string> = {
  checking: 'bg-amber-400',
  online: 'bg-emerald-500',
  offline: 'bg-red-500',
}

const LABEL: Record<Props['status'], string> = {
  checking: 'Checking backend…',
  online: 'Backend online',
  offline: 'Backend offline',
}

export function StatusBadge({ status }: Props) {
  return <span className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[status]}`} title={LABEL[status]} />
}
