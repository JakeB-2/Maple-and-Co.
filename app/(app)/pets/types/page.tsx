import { EventTypesPage, type EventTypesSearchParams } from '@/components/entities/event-types-page'

export const dynamic = 'force-dynamic'

export default function PetEventTypesPage({ searchParams }: { searchParams: EventTypesSearchParams }) {
  return <EventTypesPage kind="pet" searchParams={searchParams} />
}
