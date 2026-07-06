import { EntityIndexPage, type EntityIndexSearchParams } from '@/components/entities/entity-index-page'

export const dynamic = 'force-dynamic'

export default function PetsPage({ searchParams }: { searchParams: EntityIndexSearchParams }) {
  return <EntityIndexPage kind="pet" searchParams={searchParams} />
}
