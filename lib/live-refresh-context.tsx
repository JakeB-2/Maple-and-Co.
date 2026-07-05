'use client'

import * as React from 'react'

export type LiveRefreshStatus = 'live' | 'reconnecting' | 'degraded'

type LiveRefreshContextValue = {
  blocked: boolean
  status: LiveRefreshStatus
  setBlock: (key: symbol, blocked: boolean) => void
  setStatus: (status: LiveRefreshStatus) => void
}

const LiveRefreshContext = React.createContext<LiveRefreshContextValue | null>(null)

export function LiveRefreshProvider({ children }: { children: React.ReactNode }) {
  const blocksRef = React.useRef(new Map<symbol, boolean>())
  const [blocked, setBlocked] = React.useState(false)
  const [status, setStatus] = React.useState<LiveRefreshStatus>('live')

  const setBlock = React.useCallback((key: symbol, nextBlocked: boolean) => {
    if (nextBlocked) {
      blocksRef.current.set(key, true)
    } else {
      blocksRef.current.delete(key)
    }
    setBlocked(blocksRef.current.size > 0)
  }, [])

  const value = React.useMemo(() => ({ blocked, status, setBlock, setStatus }), [blocked, status, setBlock])

  return (
    <LiveRefreshContext.Provider value={value}>
      {children}
    </LiveRefreshContext.Provider>
  )
}

export function useLiveRefreshBlocked(): boolean {
  return React.useContext(LiveRefreshContext)?.blocked ?? false
}

export function useLiveRefreshStatus(): LiveRefreshStatus {
  return React.useContext(LiveRefreshContext)?.status ?? 'live'
}

export function useSetLiveRefreshStatus(): (status: LiveRefreshStatus) => void {
  return React.useContext(LiveRefreshContext)?.setStatus ?? (() => {})
}

export function useRegisterLiveRefreshBlock(blocked: boolean) {
  const ctx = React.useContext(LiveRefreshContext)
  const setBlock = ctx?.setBlock
  const keyRef = React.useRef<symbol | null>(null)
  if (keyRef.current == null) keyRef.current = Symbol('live-refresh-block')

  React.useEffect(() => {
    const key = keyRef.current
    if (!setBlock || !key) return
    setBlock(key, blocked)
    return () => setBlock(key, false)
  }, [blocked, setBlock])
}
