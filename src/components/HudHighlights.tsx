import { useMemo } from 'react'
import type { AnalyzeHighlight, HudCard } from '@/types/demo'
import { cn } from '@/lib/utils'

export type DisplayRect = { x: number; y: number; width: number; height: number }

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function kindTone(kind?: AnalyzeHighlight['kind']) {
  if (kind === 'person') return 'border-emerald-300/40 text-emerald-100'
  if (kind === 'object') return 'border-violet-300/40 text-violet-100'
  if (kind === 'ui') return 'border-cyan-300/40 text-cyan-100'
  return 'border-cyan-300/30 text-cyan-100'
}

export default function HudHighlights({
  rect,
  highlights,
  callouts,
}: {
  rect: DisplayRect
  highlights: AnalyzeHighlight[]
  callouts?: HudCard[]
}) {
  const items = useMemo(() => highlights.slice(0, 6), [highlights])
  const calls = useMemo(() => (callouts ? callouts.slice(0, 3) : []), [callouts])

  return (
    <div className="pointer-events-none absolute inset-0">
      {items.map((h, idx) => {
        const left = rect.x + h.x * rect.width
        const top = rect.y + h.y * rect.height
        const width = h.w * rect.width
        const height = h.h * rect.height

        return (
          <div key={h.id} className="absolute">
            <div
              className={cn('absolute rounded-md border bg-zinc-950/10 shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_0_30px_rgba(34,211,238,0.08)]', kindTone(h.kind))}
              style={{ left, top, width, height }}
            >
              <div className="absolute -left-2 -top-2 h-4 w-4 rounded-full border border-white/15 bg-cyan-400/15 hud-pulse" />
              <div className="absolute -right-2 -bottom-2 h-4 w-4 rounded-full border border-white/15 bg-cyan-400/10 hud-pulse" />
              <div className="absolute -top-2 left-2 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[11px] font-semibold tracking-wide backdrop-blur hud-pop">
                {h.label}
              </div>
            </div>

            {idx < calls.length ? (
              (() => {
                const c = calls[idx]
                const cardW = clamp(rect.width * 0.34, 220, 320)
                const cardH = 76
                const anchorX = left + width + 14
                const anchorY = top + Math.min(height * 0.5, 60)
                const cardLeft = clamp(anchorX, rect.x + 10, rect.x + rect.width - cardW - 10)
                const cardTop = clamp(anchorY - cardH * 0.5, rect.y + 10, rect.y + rect.height - cardH - 10)
                const lineX1 = left + width
                const lineY1 = top + height * 0.5
                const lineX2 = cardLeft
                const lineY2 = cardTop + cardH * 0.5
                const dx = lineX2 - lineX1
                const dy = lineY2 - lineY1
                const len = Math.max(1, Math.hypot(dx, dy))
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI
                return (
                  <>
                    <div
                      className="absolute origin-left bg-cyan-300/30"
                      style={{
                        left: lineX1,
                        top: lineY1,
                        width: len,
                        height: 1,
                        transform: `rotate(${angle}deg)`,
                      }}
                    />
                    <div
                      className="absolute rounded-xl border border-white/10 bg-zinc-950/55 px-3 py-2 text-xs text-zinc-100 backdrop-blur hud-pop"
                      style={{ left: cardLeft, top: cardTop, width: cardW, height: cardH }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-cyan-200/90">{c.title}</div>
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/70" />
                      </div>
                      <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-200/90">{c.body}</div>
                    </div>
                  </>
                )
              })()
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

