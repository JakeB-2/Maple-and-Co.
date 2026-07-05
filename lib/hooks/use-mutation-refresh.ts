'use client'

import { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { dispatchRouteRefreshEvent } from '@/lib/live-refresh-event'

const PENDING_REFRESH_KEY = 'mapleco:mutation-refresh-target'
const PENDING_REFRESH_TTL_MS = 30_000
const POST_NAV_REFRESH_DELAY_MS = 120

type NavigationOptions = { scroll?: boolean }

type PendingRefreshTarget = {
  href: string
  createdAt: number
}

function normalizeHref(href: string): string {
  if (typeof window === 'undefined') return href
  const url = new URL(href, window.location.href)
  return `${url.pathname}${url.search}`
}

function markPendingRefresh(href: string) {
  if (typeof window === 'undefined') return
  const target: PendingRefreshTarget = {
    href: normalizeHref(href),
    createdAt: Date.now(),
  }
  window.sessionStorage.setItem(PENDING_REFRESH_KEY, JSON.stringify(target))
}

export function readPendingMutationRefresh(): PendingRefreshTarget | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(PENDING_REFRESH_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PendingRefreshTarget
    if (!parsed.href || Date.now() - parsed.createdAt > PENDING_REFRESH_TTL_MS) {
      window.sessionStorage.removeItem(PENDING_REFRESH_KEY)
      return null
    }
    return parsed
  } catch {
    window.sessionStorage.removeItem(PENDING_REFRESH_KEY)
    return null
  }
}

export function clearPendingMutationRefresh() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PENDING_REFRESH_KEY)
}

/**
 * Shared post-mutation refresh helper.
 *
 * Server actions invalidate Next's data cache, but the browser can still be
 * holding an older App Router payload. These helpers refresh the active route
 * immediately, or refresh the destination route after push/replace lands.
 */
export function useMutationRefresh() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const refreshNow = useCallback(() => {
    dispatchRouteRefreshEvent()
    startTransition(() => router.refresh())
  }, [router])

  const scheduleFallbackRefresh = useCallback(() => {
    window.setTimeout(() => {
      dispatchRouteRefreshEvent()
      startTransition(() => router.refresh())
    }, POST_NAV_REFRESH_DELAY_MS)
  }, [router])

  const pushAndRefresh = useCallback(
    (href: string, options?: NavigationOptions) => {
      markPendingRefresh(href)
      router.push(href, options)
      scheduleFallbackRefresh()
    },
    [router, scheduleFallbackRefresh],
  )

  const replaceAndRefresh = useCallback(
    (href: string, options?: NavigationOptions) => {
      markPendingRefresh(href)
      router.replace(href, options)
      scheduleFallbackRefresh()
    },
    [router, scheduleFallbackRefresh],
  )

  return { refreshNow, pushAndRefresh, replaceAndRefresh, isPending }
}
