'use server'

// Uploads go through this action (never from the browser client — the
// lint-browser-mutations gate enforces that). Returns the storage path to
// stash on the owning row; unique path per upload so /media can cache hard.

import { requireAuth } from '@/lib/auth/dal'
import { ok, fail, type ActionResult } from '@/lib/action-result'

// One storage folder per owning feature — extend when a new feature uploads.
const MEDIA_FOLDERS = ['spends', 'pets'] as const

export async function uploadMediaImage(formData: FormData): Promise<ActionResult<{ path: string }>> {
  const { user, supabase } = await requireAuth()

  const folder = formData.get('folder')
  if (typeof folder !== 'string' || !(MEDIA_FOLDERS as readonly string[]).includes(folder)) {
    return fail('Unknown upload folder.')
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return fail('No photo attached.')
  if (file.size > 8 * 1024 * 1024) return fail('Photo is too large (8 MB max).')
  if (!file.type.startsWith('image/')) return fail('Only images can be attached.')

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${folder}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from('media').upload(path, file, {
    contentType: file.type,
    // cache hint for the /media proxy; paths are unique so immutable is safe
    cacheControl: '86400',
  })

  if (error) return fail('Upload failed. Try again?')
  // Stamp who uploaded via path convention only; the owning row carries audit.
  void user
  return ok({ path })
}
