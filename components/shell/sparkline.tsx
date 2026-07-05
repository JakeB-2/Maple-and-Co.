// Tiny inline trend line — no axes, no chart lib. Parent sizes it via
// className; stroke inherits currentColor so callers color it with text-*.

const VIEW_W = 100
const VIEW_H = 32
const PAD = 2 // half the stroke width, so peaks never clip at the edges

type SparklineProps = {
  points: number[]
  className?: string
}

export function Sparkline({ points, className }: SparklineProps) {
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min

  const coords = points
    .map((point, index) => {
      const x = PAD + (index / (points.length - 1)) * (VIEW_W - PAD * 2)
      // Flat series draws mid-height instead of hugging an edge.
      const t = range === 0 ? 0.5 : (point - min) / range
      const y = VIEW_H - PAD - t * (VIEW_H - PAD * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={coords}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
