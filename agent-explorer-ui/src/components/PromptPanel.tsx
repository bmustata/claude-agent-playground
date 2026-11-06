import type { KeyboardEvent } from 'react'
import { AssetPicker } from './AssetPicker'
import { ImageStrip, type UploadedImage } from './ImageStrip'
import { ImageUploadButton } from './ImageUploadButton'
import type { Asset } from '../lib/api'

type Props = {
  prompt: string
  onPromptChange: (value: string) => void
  onSend: () => void
  onClear: () => void
  images: UploadedImage[]
  uploading: boolean
  onUpload: (files: File[]) => void
  onRemoveImage: (image: UploadedImage) => void
  onPickAssets: (assets: Asset[]) => void
  onSaveToLibrary: () => void
  disabled: boolean
  rows?: number
}

export function PromptPanel({ prompt, onPromptChange, onSend, onClear, images, uploading, onUpload, onRemoveImage, onPickAssets, onSaveToLibrary, disabled, rows = 3 }: Props) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onSend()
    }
  }

  return (
    <div>
      <ImageStrip images={images} onRemove={onRemoveImage} disabled={disabled} />
      <textarea
        id="prompt"
        name="prompt"
        aria-label="Prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter your prompt... (Ctrl+Enter to send)"
        rows={rows}
        disabled={disabled}
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 outline-none focus:border-indigo-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !prompt.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Clear
        </button>
        {/* One split button: the two halves share the middle border. */}
        <div className="flex">
          <ImageUploadButton onFiles={onUpload} uploading={uploading} disabled={disabled} />
          <AssetPicker attachedIds={images.map((image) => image.id)} onPick={onPickAssets} disabled={disabled} />
        </div>
        <button
          type="button"
          onClick={onSaveToLibrary}
          disabled={!prompt.trim()}
          className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Save to Library
        </button>
      </div>
    </div>
  )
}
