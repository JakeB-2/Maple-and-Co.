// Shared Pets/Plants index body (D-032/D-033): one component parameterized by
// kind — the two route files are thin wrappers, not clones.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireAuth } from '@/lib/auth/dal'
import { fetchEntities, type EntityKind } from '@/lib/queries/entities'
import { PageHeader } from '@/components/shell/page-header'
import { HeaderMenu } from '@/components/shell/header-menu'
import { Surface } from '@/components/screens/surface'
import { ResourceCreateDrawer } from '@/components/screens/resource-form-drawers'
import { EntityCapturePicker } from '@/components/entities/entity-capture-picker'
import { EntityFormBody } from '@/components/entities/entity-form-body'
import { KIND_COPY, entityPath } from '@/components/entities/entity-kind'

export type EntityIndexSearchParams = Promise<{ new?: string; capture?: string }>

export async function EntityIndexPage({
  kind,
  searchParams,
}: {
  kind: EntityKind
  searchParams: EntityIndexSearchParams
}) {
  const { supabase } = await requireAuth()
  const params = await searchParams
  const copy = KIND_COPY[kind]

  const entities = await fetchEntities(supabase, kind)

  // ?capture=1 (from the shell FAB): exactly one entity skips the who-is-it-for
  // step entirely — straight to that profile's type picker. Zero entities have
  // nothing to log against, so the param is ignored.
  const capturing = params.capture === '1' && entities.length > 0
  if (capturing && entities.length === 1) {
    redirect(`${entityPath(kind, entities[0].id)}?capture=1`)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.label}
        actions={
          <HeaderMenu
            items={[{ label: 'Event types', href: `${copy.base}/types`, icon: Settings2 }]}
          />
        }
      />

      {entities.length === 0 ? (
        <Surface className="px-6 py-10 text-center text-sm text-muted-foreground">
          No {copy.noun}s yet — add the first one.
        </Surface>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {entities.map((entity) => (
            <Link key={entity.id} href={entityPath(kind, entity.id)}>
              <Surface className="flex min-h-24 touch:min-h-28 flex-col items-center justify-center gap-2 p-4 transition-colors hover:bg-surface-2">
                {entity.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element -- authed same-origin proxy; next/image can't fetch it
                  <img
                    src={`/media/${entity.photo_path}`}
                    alt={entity.name}
                    className="size-16 rounded-full border object-cover"
                  />
                ) : (
                  <span
                    className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-3xl"
                    aria-hidden
                  >
                    {copy.emoji}
                  </span>
                )}
                <span className="max-w-full truncate text-sm font-medium">{entity.name}</span>
              </Surface>
            </Link>
          ))}
        </div>
      )}

      <Button asChild variant="outline" className="self-start">
        <Link href={`${copy.base}?new=1`}>
          <Plus /> New {copy.noun}
        </Link>
      </Button>

      {capturing && (
        <EntityCapturePicker entities={entities} captureParam={params.capture === '1' ? '1' : null} />
      )}

      <ResourceCreateDrawer
        isOpen={params.new === '1'}
        title={`New ${copy.noun}`}
        body={<EntityFormBody mode="new" kind={kind} />}
        size="sm"
      />
    </div>
  )
}
