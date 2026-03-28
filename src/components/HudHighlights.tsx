import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { X } from 'lucide-react'
import type { AnalyzeHighlight, DemoMode } from '@/types/demo'
import { cn } from '@/lib/utils'

export type DisplayRect = { x: number; y: number; width: number; height: number }

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function kindTone(kind?: AnalyzeHighlight['kind']) {
  if (kind === 'person') return 'border-emerald-300/45 text-emerald-100'
  if (kind === 'object') return 'border-violet-300/45 text-violet-100'
  if (kind === 'ui') return 'border-cyan-300/45 text-cyan-100'
  return 'border-cyan-300/35 text-cyan-100'
}

function defaultActionForMode(mode: DemoMode, highlight: AnalyzeHighlight) {
  return highlight.actions?.[0] ?? (mode === 'translate' ? '翻译' : mode === 'travel' ? '导航' : mode === 'office' ? '摘要' : mode === 'business' ? '识别' : '识别')
}

function resolveHudCopy(mode: DemoMode, highlight: AnalyzeHighlight, action: string) {
  if (action.includes('翻译')) {
    return {
      eyebrow: 'AI Translation',
      title: '实时翻译',
      body: highlight.translatedText || highlight.detail || highlight.label,
    }
  }
  if (action.includes('解释') || action.includes('说明')) {
    return {
      eyebrow: 'AI Context',
      title: '上下文解释',
      body: highlight.detail || highlight.translatedText || highlight.label,
    }
  }
  if (action.includes('摘要')) {
    return {
      eyebrow: 'AI Summary',
      title: '内容摘要',
      body: highlight.detail || highlight.translatedText || highlight.label,
    }
  }
  if (action.includes('待办') || action.includes('操作')) {
    return {
      eyebrow: 'AI Action',
      title: '下一步动作',
      body: highlight.detail || highlight.translatedText || highlight.label,
    }
  }
  if (action.includes('导航') || action.includes('确认') || action.includes('绕行')) {
    return {
      eyebrow: 'AI Navigation',
      title: '导航建议',
      body: highlight.detail || highlight.translatedText || highlight.label,
    }
  }
  if (action.includes('提醒') || action.includes('状态')) {
    return {
      eyebrow: 'AI Alert',
      title: '实时提醒',
      body: highlight.detail || highlight.translatedText || highlight.label,
    }
  }
  if (action.includes('识别')) {
    return {
      eyebrow: mode === 'business' ? 'AI Contact' : 'AI Vision',
      title: mode === 'business' ? '身份识别' : '目标识别',
      body: highlight.translatedText || highlight.detail || highlight.label,
    }
  }
  return {
    eyebrow: 'AI HUD',
    title: action,
    body: highlight.detail || highlight.translatedText || highlight.label,
  }
}

export default function HudHighlights({
  rect,
  highlights,
  mode,
}: {
  rect: DisplayRect
  highlights: AnalyzeHighlight[]
  mode: DemoMode
}) {
  const items = useMemo(() => highlights.slice(0, 6), [highlights])
  const [selectedId, setSelectedId] = useState<string>()
  const [selectedAction, setSelectedAction] = useState<string>()
  const [cardOffset, setCardOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{
    startX: number
    startY: number
    baseOffsetX: number
    baseOffsetY: number
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null>(null)

  useEffect(() => {
    setSelectedId(undefined)
    setSelectedAction(undefined)
    setCardOffset({ x: 0, y: 0 })
    dragRef.current = null
    setIsDragging(false)
  }, [highlights, mode])

  const selected = useMemo(() => items.find((item) => item.id === selectedId), [items, selectedId])

  useEffect(() => {
    if (!selected) return
    const available = selected.actions?.length ? selected.actions : [defaultActionForMode(mode, selected)]
    if (!selectedAction || !available.includes(selectedAction)) {
      setSelectedAction(available[0])
    }
  }, [mode, selected, selectedAction])

  useEffect(() => {
    setCardOffset({ x: 0, y: 0 })
    dragRef.current = null
    setIsDragging(false)
  }, [selectedId])

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const nextX = clamp(drag.baseOffsetX + event.clientX - drag.startX, drag.minX, drag.maxX)
      const nextY = clamp(drag.baseOffsetY + event.clientY - drag.startY, drag.minY, drag.maxY)
      setCardOffset({ x: nextX, y: nextY })
    }

    function stopDrag() {
      if (!dragRef.current) return
      dragRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDrag)
      window.removeEventListener('pointercancel', stopDrag)
    }
  }, [])

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, baseLeft: number, baseTop: number, cardW: number, cardH: number) {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseOffsetX: cardOffset.x,
      baseOffsetY: cardOffset.y,
      minX: rect.x + 12 - baseLeft,
      maxX: rect.x + rect.width - cardW - 12 - baseLeft,
      minY: rect.y + 12 - baseTop,
      maxY: rect.y + rect.height - cardH - 12 - baseTop,
    }
    setIsDragging(true)
  }

  return (
    <div className="absolute inset-0">
      {items.map((h) => {
        const left = rect.x + h.x * rect.width
        const top = rect.y + h.y * rect.height
        const width = h.w * rect.width
        const height = h.h * rect.height
        const active = selectedId === h.id

        return (
          <button
            key={h.id}
            type="button"
            className="absolute pointer-events-auto text-left"
            style={{ left, top, width, height }}
            onClick={() => {
              if (active) {
                setSelectedId(undefined)
                setSelectedAction(undefined)
                return
              }
              setSelectedId(h.id)
              setSelectedAction(defaultActionForMode(mode, h))
            }}
          >
            <div
              className={cn(
                'absolute inset-0 rounded-xl border bg-zinc-950/10 shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_0_28px_rgba(34,211,238,0.08)] transition duration-200',
                kindTone(h.kind),
                active ? 'bg-cyan-400/8 shadow-[0_0_0_1px_rgba(165,243,252,0.22),0_0_40px_rgba(34,211,238,0.18)]' : 'hover:bg-cyan-400/6',
              )}
            >
              <div className={cn('absolute -left-2 -top-2 h-4 w-4 rounded-full border border-white/15 bg-cyan-400/15', active ? 'hud-pulse' : '')} />
              <div className={cn('absolute -right-2 -bottom-2 h-4 w-4 rounded-full border border-white/15 bg-cyan-400/10', active ? 'hud-pulse' : '')} />
              <div
                className={cn(
                  'absolute -top-3 left-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-cyan-50 backdrop-blur hud-pop',
                  active ? 'border-cyan-200/25 bg-cyan-500/12 text-cyan-100' : '',
                )}
              >
                <span>{h.label}</span>
                <span className="text-[10px] text-zinc-400">{active ? 'SELECTED' : 'TAP'}</span>
              </div>
            </div>
          </button>
        )
      })}

      {selected && selectedAction
        ? (() => {
            const left = rect.x + selected.x * rect.width
            const top = rect.y + selected.y * rect.height
            const width = selected.w * rect.width
            const height = selected.h * rect.height
            const cardW = clamp(rect.width * 0.3, 260, 340)
            const cardH = 208
            const preferRight = left + width + cardW + 34 < rect.x + rect.width
            const anchorX = preferRight ? left + width : left
            const anchorY = top + Math.min(height * 0.5, 72)
            const idealLeft = preferRight ? left + width + 18 : left - cardW - 18
            const cardLeft = clamp(idealLeft, rect.x + 12, rect.x + rect.width - cardW - 12)
            const cardTop = clamp(anchorY - 94, rect.y + 12, rect.y + rect.height - cardH - 12)
            const finalLeft = cardLeft + cardOffset.x
            const finalTop = cardTop + cardOffset.y
            const lineX2 = preferRight ? finalLeft : finalLeft + cardW
            const lineY2 = finalTop + 92
            const dx = lineX2 - anchorX
            const dy = lineY2 - anchorY
            const len = Math.max(1, Math.hypot(dx, dy))
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI
            const copy = resolveHudCopy(mode, selected, selectedAction)
            const actions = selected.actions?.length ? selected.actions.slice(0, 3) : [selectedAction]

            return (
              <>
                <div
                  className="absolute origin-left bg-cyan-200/40"
                  style={{
                    left: anchorX,
                    top: anchorY,
                    width: len,
                    height: 1.5,
                    transform: `rotate(${angle}deg)`,
                  }}
                />
                <div
                  className="absolute pointer-events-auto rounded-[22px] border border-cyan-100/12 bg-zinc-950/78 px-4 py-4 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl hud-pop"
                  style={{ left: finalLeft, top: finalTop, width: cardW, minHeight: cardH }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold tracking-[0.22em] text-cyan-200/70">{copy.eyebrow}</div>
                      <div className="mt-1 text-2xl font-semibold text-cyan-100">{copy.title}</div>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:text-white"
                      onClick={() => {
                        setSelectedId(undefined)
                        setSelectedAction(undefined)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div
                    className={cn(
                      'mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] tracking-[0.18em] transition',
                      isDragging ? 'border-cyan-200/30 bg-cyan-400/12 text-cyan-100' : 'border-white/10 bg-white/5 text-zinc-400',
                    )}
                    onPointerDown={(event) => startDrag(event, cardLeft, cardTop, cardW, cardH)}
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                    <span>{isDragging ? 'DRAGGING HUD' : 'DRAG HUD'}</span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-cyan-200/10 bg-white/[0.03] px-3 py-3">
                    <div className="text-[10px] tracking-[0.18em] text-zinc-500">SELECTED ELEMENT</div>
                    <div className="mt-1 text-sm font-medium text-zinc-50">{selected.sourceText || selected.label}</div>
                    {mode === 'translate' && selected.translatedText ? (
                      <div className="mt-2 text-sm text-cyan-100/90">译文：{selected.translatedText}</div>
                    ) : null}
                  </div>

                  <div className="mt-4 text-sm leading-7 text-zinc-200/88">{copy.body}</div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {actions.map((action) => {
                      const active = action === selectedAction
                      return (
                        <button
                          key={action}
                          type="button"
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                            active
                              ? 'border-cyan-200/30 bg-cyan-400/12 text-cyan-100'
                              : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-zinc-100',
                          )}
                          onClick={() => setSelectedAction(action)}
                        >
                          {action}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-zinc-100"
                      onClick={() => {
                        setSelectedId(undefined)
                        setSelectedAction(undefined)
                      }}
                    >
                      收起
                    </button>
                  </div>

                  <div className="mt-3 text-[11px] text-zinc-500">点击其他高亮框可切换新的 HUD 卡片。</div>
                </div>
              </>
            )
          })()
        : null}
    </div>
  )
}
