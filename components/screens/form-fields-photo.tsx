'use client'

// Shared photo picker for RHF forms: hidden file input -> uploadMediaImage ->
// writes the storage path to the form key, with a preview + remove control.
// One component behind spend / pet / pet-event photo fields (no clones).

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { uploadMediaImage } from '@/lib/actions/media'
import { FieldWrapper, useFormContext } from '@/components/screens/form-shell'
import { Button } from '@/components/ui/button'

// Mirror of media.ts's MEDIA_FOLDERS whitelist (that runtime list stays the
// source of truth; a 'use server' file can't cleanly export a shared type).
type MediaFolder = 'spends' | 'pets' | 'plants' | 'household'

export function PhotoField({
  name,
  folder,
  label = 'Photo',
  required = false,
  alt = 'Attached photo',
}: {
  name: string
  folder: MediaFolder
  label?: string
  required?: boolean
  alt?: string
}) {
  const { register, setValue, watch, formState } = useFormContext()
  const filePath = watch(name) as string
  const error = formState.errors[name]?.message as string | undefined
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-picking the same file after a failure
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      const result = await uploadMediaImage(formData)
      if (result.error !== null) toast.error(result.error)
      else setValue(name, result.data.path, { shouldDirty: true })
    } finally {
      setUploading(false)
    }
  }

  return (
    <FieldWrapper label={label} error={error} required={required} span="full">
      <input type="hidden" {...register(name)} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onPick}
      />
      {filePath ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- authed same-origin proxy; next/image can't fetch it */}
          <img
            src={`/media/${filePath}`}
            alt={alt}
            className="max-h-40 rounded-lg border object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -right-2 -top-2 size-7 touch:size-9 rounded-full shadow"
            aria-label="Remove photo"
            onClick={() => setValue(name, '', { shouldDirty: true })}
          >
            <X />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {uploading ? 'Uploading…' : 'Add photo'}
        </Button>
      )}
    </FieldWrapper>
  )
}
