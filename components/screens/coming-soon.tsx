// Placeholder screen for tabs whose milestone hasn't landed yet.
// Dies feature by feature as M1–M4 ship.

import { Card, CardContent } from '@/components/ui/card'

export function ComingSoon({ title, milestone, blurb }: { title: string; milestone: string; blurb: string }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </header>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <span className="text-3xl" aria-hidden>
            🐾
          </span>
          <p className="text-sm font-medium">{blurb}</p>
          <p className="text-xs text-muted-foreground">Arrives in {milestone}.</p>
        </CardContent>
      </Card>
    </div>
  )
}
