import { EventTypesPage, type EventTypesSearchParams } from '@/components/entities/event-types-page'

export const dynamic = 'force-dynamic'

export default function PlantEventTypesPage({ searchParams }: { searchParams: EventTypesSearchParams }) {
  return <EventTypesPage kind="plant" searchParams={searchParams} />
}
