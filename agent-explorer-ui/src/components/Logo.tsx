// No background of its own — sits directly on the header bar's gradient, so it reads as
// part of the bar rather than a separate badge. public/favicon.svg carries the matching
// background (same gradient as the header bar) since a browser tab has no bar to sit on.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="3.4" r="1.1" fill="#fff" />
      <line x1="12" y1="4.5" x2="12" y2="6.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="5" y="6.5" width="14" height="11" rx="4" fill="#fff" />
      <circle cx="9.5" cy="12" r="2.1" fill="#fb923c" />
      <circle cx="14.5" cy="12" r="2.1" fill="#34d399" />
      <circle cx="9.9" cy="11.4" r="0.55" fill="#fff" />
      <circle cx="14.9" cy="11.4" r="0.55" fill="#fff" />
      <rect x="9" y="15" width="6" height="1.4" rx="0.7" fill="#fbbf24" />
    </svg>
  )
}
