'use client'

// The "who is it for?" step of capture (D-033): /pets?capture=1 with MULTIPLE
// live entities lands here — a bottom sheet of entity rows, each continuing to
// that profile's quick-log picker. (Exactly one entity server-redirects past
// this; zero ignores the param — see the index page.)

import Link from 'next/link'
import type { EntityRow } from '@/lib/queries/entities'
import { DrawerShell } from '@/components/screens/detail-drawer'
import { FormDrawerChrome } from '@/components/screens/form-drawer'
import { KIND_COPY, entityPath } from '@/components/entities/entity-kind'

export function EntityCapturePicker({
  entities,
  captureParam,
}: {
  entities: EntityRow[]
  /** '1' when the picker should be open (?capture=1), else null. */
  captureParam: string | null
}) {
  return (
    <DrawerShell
      paramKey="capture"
      paramValue={captureParam}
      mobilePresentation="bottom"
      size="sm"
      title="Who is it for?"
    >
      <FormDrawerChrome mode="create" title="Who is it for?">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {entities.map((entity) => (
            <Link
              key={entity.id}
              href={`${entityPath(entity.kind, entity.id)}?capture=1`}
              className="flex min-h-20 touch:min-h-24 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 text-center text-sm font-medium transition-colors hover:bg-surface-2"
            >
              {entity.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element -- authed same-origin proxy; next/image can't fetch it
                <img
                  src={`/media/${entity.photo_path}`}
                  alt=""
                  className="size-10 rounded-full border object-cover"
                />
              ) : (
                <span className="text-2xl" aria-hidden>
                  {KIND_COPY[entity.kind].emoji}
                </span>
              )}
              {entity.name}
            </Link>
          ))}
        </div>
      </FormDrawerChrome>
    </DrawerShell>
  )
}
