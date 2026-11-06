import { Logo } from './Logo'
import { PillToggle } from './PillToggle'
import { ThemeToggle } from './ThemeToggle'
import type { Theme } from '../lib/useTheme'

type Props = {
  markdownOn: boolean
  onToggleMarkdown: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function Header({ markdownOn, onToggleMarkdown, theme, onToggleTheme }: Props) {
  return (
    <header className="flex items-center justify-between bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#4338ca] px-5 py-3 shadow-sm">
      <span className="group flex cursor-default items-center gap-2 text-lg font-bold text-white select-none">
        <Logo className="h-6 w-6 transition-transform duration-200 ease-out group-hover:scale-125 group-active:scale-150" />
        Agent Playground
      </span>
      <div className="flex items-center gap-2">
        <PillToggle label="Markdown" active={markdownOn} onToggle={onToggleMarkdown} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}
