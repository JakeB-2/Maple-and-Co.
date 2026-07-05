// Authed image proxy for the private `media` bucket (D-018).
// <img src="/media/spends/abc.jpg"> → requireAuth → stream from storage.
// Uses the user-scoped client so RLS stays the authority; the `captures`
// bucket is deliberately NOT reachable through here (raw AI inbox, no UI).

import { requireAuth } from '@/lib/auth/dal'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { supabase } = await requireAuth()
  const { path } = await params
  const objectPath = path.map(decodeURIComponent).join('/')

  const { data, error } = await supabase.storage.from('media').download(objectPath)

  if (error || !data) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      // Private: it's household media behind auth. Immutable-ish: uploads get
      // unique paths, so a day of caching is safe and keeps scrolling snappy.
      'Cache-Control': 'private, max-age=86400',
    },
  })
}
