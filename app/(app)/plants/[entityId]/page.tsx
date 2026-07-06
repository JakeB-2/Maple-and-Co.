import {
  EntityProfilePage,
  type EntityProfileParams,
  type EntityProfileSearchParams,
} from '@/components/entities/entity-profile-page'

export const dynamic = 'force-dynamic'

export default function PlantProfilePage({
  params,
  searchParams,
}: {
  params: EntityProfileParams
  searchParams: EntityProfileSearchParams
}) {
  return <EntityProfilePage kind="plant" params={params} searchParams={searchParams} />
}
