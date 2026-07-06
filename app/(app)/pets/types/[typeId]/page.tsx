import {
  EventTypeDetailPage,
  type EventTypeDetailParams,
  type EventTypeDetailSearchParams,
} from '@/components/entities/event-type-detail-page'

export const dynamic = 'force-dynamic'

export default function PetEventTypeDetailPage({
  params,
  searchParams,
}: {
  params: EventTypeDetailParams
  searchParams: EventTypeDetailSearchParams
}) {
  return <EventTypeDetailPage kind="pet" params={params} searchParams={searchParams} />
}
