export type UploadedImage = {
  id: string // asset id on the server
  name: string
  previewUrl: string // object URL of the local file
}

type Props = {
  images: UploadedImage[]
  onRemove: (image: UploadedImage) => void
  disabled?: boolean
}

export function ImageStrip({ images, onRemove, disabled }: Props) {
  if (images.length === 0) return null

  return (
    <ul className="mb-3 flex flex-wrap gap-2">
      {images.map((image) => (
        <li key={image.id} className="relative">
          <img
            src={image.previewUrl}
            alt={image.name}
            title={image.name}
            className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
          />
          <button
            type="button"
            onClick={() => onRemove(image)}
            disabled={disabled}
            aria-label={`Remove ${image.name}`}
            title="Remove image"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs leading-none text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
