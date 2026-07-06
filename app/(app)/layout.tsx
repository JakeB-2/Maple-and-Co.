// Presentational shell only — NO auth here. Layouts don't re-render on client
// navigation (documented Next anti-pattern, D-010); every page under this
// group calls requireAuth() itself.

import { TabBar } from '@/components/shell/tab-bar'
import { CaptureFab } from '@/components/shell/capture-fab'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // pb clears the tab bar AND the bottom-center FAB band (fixed at bottom-24,
    // ~40px tall) — since the FAB moved to center (D-033) it would otherwise sit
    // on centered end-of-page content like the Finance table's "Show more".
    <div className="min-h-dvh pb-40">
      <main className="mx-auto w-full max-w-lg px-4 pt-4">{children}</main>
      <CaptureFab />
      <TabBar />
    </div>
  )
}
