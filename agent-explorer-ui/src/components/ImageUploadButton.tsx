import { useRef, type ChangeEvent } from 'react'

// Image types Claude accepts; must match the backend's assets.ts.
const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp'

type Props = {
  onFiles: (files: File[]) => void
  uploading: boolean
  disabled?: boolean
}

export function ImageUploadButton({ onFiles, uploading, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = '' // lets the same file be picked again
    if (files.length > 0) onFiles(files)
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={ACCEPT} multiple onChange={handleChange} className="hidden" aria-label="Image files" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        title="Upload images (jpeg, png, gif or webp, max 10 MB each)"
        className="rounded-l-lg border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {uploading ? '⏳ Uploading…' : '🖼️ Upload'}
      </button>
    </>
  )
}
