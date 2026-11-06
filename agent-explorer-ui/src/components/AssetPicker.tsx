import { useEffect, useState } from 'react'
import { ApiError, assetUrl, listAssets, type Asset } from '../lib/api'

type Props = {
  attachedIds: string[] // already attached to the prompt, so not offered again
  onPick: (assets: Asset[]) => void
  disabled?: boolean
}

export function AssetPicker({ attachedIds, onPick, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const handleOpen = async () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    setSelected([])
    setError(null)
    setLoading(true)
    try {
      setAssets(await listAssets())
    } catch (err) {
      console.error('listAssets failed:', err)
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  const handleAdd = () => {
    onPick(assets.filter((asset) => selected.includes(asset.id)))
    setOpen(false)
  }

  const available = assets.filter((asset) => !attachedIds.includes(asset.id))

  return (
    <span className="relative">
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        title="Pick from images already uploaded"
        className="rounded-r-lg border border-l-0 border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        📁 Pick
      </button>
      {open && (
        // Opens upward because the prompt panel can be pinned to the bottom of the viewport.
        <div className="absolute bottom-full left-0 z-20 mb-2 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            title="Close (Esc)"
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            ×
          </button>
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && available.length === 0 && <p className="text-sm text-slate-500">No other uploaded images.</p>}
          <ul className="mt-5 grid max-h-60 grid-cols-4 gap-2 overflow-y-auto">
            {available.map((asset) => {
              const isSelected = selected.includes(asset.id)
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => toggle(asset.id)}
                    aria-pressed={isSelected}
                    title={asset.id}
                    className={`block rounded-lg border-2 ${isSelected ? 'border-indigo-500' : 'border-transparent'}`}
                  >
                    <img src={assetUrl(asset.id)} alt={asset.id} loading="lazy" className="h-16 w-16 rounded-md object-cover" />
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selected.length === 0}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add{selected.length > 0 ? ` (${selected.length})` : ''}
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
