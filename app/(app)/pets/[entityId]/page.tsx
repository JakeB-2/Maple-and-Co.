import {
  EntityProfilePage,
  type EntityProfileParams,
  type EntityProfileSearchParams,
} from '@/components/entities/entity-profile-page'

export const dynamic = 'force-dynamic'

export default function PetProfilePage({
  params,
  searchParams,
}: {
  params: EntityProfileParams
  searchParams: EntityProfileSearchParams
}) {
  return <EntityProfilePage kind="pet" params={params} searchParams={searchParams} />
}
