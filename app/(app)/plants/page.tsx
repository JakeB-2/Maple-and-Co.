import { EntityIndexPage, type EntityIndexSearchParams } from '@/components/entities/entity-index-page'

export const dynamic = 'force-dynamic'

export default function PlantsPage({ searchParams }: { searchParams: EntityIndexSearchParams }) {
  return <EntityIndexPage kind="plant" searchParams={searchParams} />
}
