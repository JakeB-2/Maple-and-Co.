export const ROUTE_REFRESH_EVENT = 'mapleco:route-refresh'

export function dispatchRouteRefreshEvent() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ROUTE_REFRESH_EVENT))
}
