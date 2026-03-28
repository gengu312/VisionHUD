import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnalyzeResult } from '@/types/demo'
import { cn } from '@/lib/utils'
import GlassPanel from '@/components/ui/GlassPanel'
import HudHighlights from '@/components/HudHighlights'

function safeRect(w: number, h: number) {
  return { x: 0, y: 0, width: Math.max(1, w), height: Math.max(1, h) }
}

function computeContainRect(containerW: number, containerH: number, mediaW: number, mediaH: number) {
  const cw = Math.max(1, containerW)
  const ch = Math.max(1, containerH)
  const mw = Math.max(1, mediaW)
  const mh = Math.max(1, mediaH)
  const car = cw / ch
  const mar = mw / mh
  if (car > mar) {
    const height = ch
    const width = height * mar
    return { x: (cw - width) / 2, y: 0, width, height }
  }
  const width = cw
  const height = width / mar
  return { x: 0, y: (ch - height) / 2, width, height }
}

type Props = {
  status: 'idle' | 'uploading' | 'scanning' | 'done' | 'error'
  previewUrl?: string
  fileType?: 'image' | 'video'
  result?: AnalyzeResult
}

function StatusBadge({ status }: { status: Props['status'] }) {
  const label = status === 'uploading' ? 'UPLOADING' : status === 'scanning' ? 'SCANNING' : status === 'done' ? 'READY' : status === 'error' ? 'ERROR' : 'IDLE'
  const color = status === 'done' ? 'text-emerald-200 border-emerald-300/25 bg-emerald-500/10' : status === 'error' ? 'text-rose-200 border-rose-300/25 bg-rose-500/10' : 'text-cyan-200 border-cyan-300/25 bg-cyan-500/10'
  return <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wider', color)}>{label}</div>
}

export default function HudMediaFrame({ status, previewUrl, fileType, result }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box) return
      setContainerSize({ width: box.width, height: box.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const displayRect = useMemo(() => {
    if (!previewUrl) return safeRect(containerSize.width, containerSize.height)
    if (containerSize.width <= 0 || containerSize.height <= 0) return safeRect(1, 1)
    if (mediaSize.width <= 0 || mediaSize.height <= 0) return safeRect(containerSize.width, containerSize.height)
    return computeContainRect(containerSize.width, containerSize.height, mediaSize.width, mediaSize.height)
  }, [containerSize.height, containerSize.width, mediaSize.height, mediaSize.width, previewUrl])

  const overlayHighlights = useMemo(() => {
    if (status !== 'done' || !previewUrl || !result) return []
    if (result.highlights && result.highlights.length) return result.highlights
    if (!result.cards.length) return []
    return [
      { id: 'hl-fallback-1', label: 'HUD Focus', kind: 'ui' as const, x: 0.12, y: 0.18, w: 0.36, h: 0.16, confidence: 0.62 },
      { id: 'hl-fallback-2', label: 'Signal', kind: 'unknown' as const, x: 0.56, y: 0.28, w: 0.28, h: 0.18, confidence: 0.58 },
      { id: 'hl-fallback-3', label: 'Anchor', kind: 'object' as const, x: 0.22, y: 0.62, w: 0.22, h: 0.18, confidence: 0.55 },
    ]
  }, [previewUrl, result, status])

  const showHighlights = overlayHighlights.length > 0

  return (
    <GlassPanel glow className="relative h-[520px] w-full overflow-hidden">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-3">
        <StatusBadge status={status} />
        {result?.scene?.name ? <div className="text-xs text-zinc-300">Scene: {result.scene.name}</div> : null}
      </div>

      <div ref={containerRef} className="absolute inset-0">
        {previewUrl ? (
          fileType === 'video' ? (
            <video
              className="h-full w-full object-contain"
              src={previewUrl}
              controls
              playsInline
              onLoadedMetadata={(e) => setMediaSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })}
            />
          ) : (
            <img
              className="h-full w-full object-contain"
              src={previewUrl}
              alt="preview"
              onLoad={(e) => setMediaSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">上传图片或视频开始体验</div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.25),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(56,189,248,0.18),transparent_52%)]" />
        <div className="absolute inset-0 hud-scan" />
        <div className={cn('absolute inset-0 transition-opacity', status === 'scanning' ? 'opacity-100' : 'opacity-0')}>
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-cyan-400/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-cyan-400/20 to-transparent" />
        </div>
        {showHighlights && result ? <HudHighlights rect={displayRect} highlights={overlayHighlights} mode={result.mode} /> : null}
        {showHighlights ? (
          <div className="absolute right-4 top-4 rounded-full border border-cyan-200/15 bg-zinc-950/45 px-3 py-1.5 text-[11px] tracking-[0.18em] text-cyan-100/75 backdrop-blur">
            TAP HIGHLIGHT TO OPEN HUD
          </div>
        ) : null}
        <div className="absolute left-4 bottom-4 rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
          <div className="font-semibold text-cyan-200/90">AI HUD</div>
          <div className="mt-0.5 text-[11px] text-zinc-400">{result?.meta?.overlayMode === 'semantic' ? 'Semantic overlay' : 'First-person overlay'}</div>
          {result?.meta?.model ? <div className="mt-0.5 text-[11px] text-zinc-500">{result.meta.model}</div> : null}
        </div>
        <div className="absolute inset-0 hud-corners" />
      </div>
    </GlassPanel>
  )
}
