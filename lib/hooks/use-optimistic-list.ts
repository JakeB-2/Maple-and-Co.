'use client'

/**
 * useOptimisticList — single shared optimistic list machinery for the inline-
 * row CRUD tabs.
 *
 * Each tab calls `useOptimisticList(items)` and renders against the returned
 * `optimisticItems`. Inside the existing `startTransition(async () => …)`
 * block, call `applyOptimistic({ kind: 'add' | 'update' | 'remove', ... })`
 * before the server-action `await`. React reverts the optimistic state
 * automatically when the transition resolves — list items get re-derived
 * from the new server props on the next render after `router.refresh()`.
 *
 * Optimistic ids: callers should generate a temporary `optimistic-<n>` id
 * for inserts so the row has a key during its in-flight life. The real id
 * comes back when the server-side router.refresh re-renders with the saved
 * row.
 */
import { useOptimistic } from 'react'

export type OptimisticAction<T extends { id: string }> =
  | { kind: 'add'; row: T }
  | { kind: 'update'; row: T }
  | { kind: 'remove'; id: string }

function reduce<T extends { id: string }>(state: T[], action: OptimisticAction<T>): T[] {
  switch (action.kind) {
    case 'add':    return [...state, action.row]
    case 'update': return state.map((it) => (it.id === action.row.id ? action.row : it))
    case 'remove': return state.filter((it) => it.id !== action.id)
  }
}

export function useOptimisticList<T extends { id: string }>(items: T[]) {
  return useOptimistic<T[], OptimisticAction<T>>(items, reduce)
}
