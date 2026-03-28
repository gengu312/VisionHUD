import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import HudBackdrop from '@/components/HudBackdrop'
import GlassPanel from '@/components/ui/GlassPanel'
import Button from '@/components/ui/Button'
import { useDemoStore } from '@/store/demoStore'
import type { HistoryItem } from '@/types/demo'

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

function modeLabel(mode: HistoryItem['mode']) {
  return mode === 'translate' ? '翻译' : mode === 'travel' ? '出行' : mode === 'office' ? '办公' : mode === 'business' ? '商务' : '识物'
}

function canPlayVideoPreview(previewUrl: string) {
  return previewUrl.startsWith('blob:') || previewUrl.startsWith('http')
}

export default function History() {
  const nav = useNavigate()
  const { history, loadHistory, clearHistory, setMedia, setMode, setResult, setStatus, setErrorMessage } = useDemoStore()
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const items = useMemo(() => history, [history])

  function replay(item: HistoryItem) {
    setMode(item.mode)
    const replayType = item.fileType === 'video' && !canPlayVideoPreview(item.previewUrl) ? 'image' : item.fileType
    setMedia({ fileType: replayType, fileName: item.fileName, previewUrl: item.previewUrl })
    setResult(item.result)
    setStatus('done')
    setErrorMessage(undefined)
    nav('/demo')
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <HudBackdrop />
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant={confirm ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                if (!confirm) {
                  setConfirm(true)
                  return
                }
                clearHistory()
                setConfirm(false)
              }}
              disabled={items.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              {confirm ? '确认清空' : '清空历史'}
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-lg font-semibold text-zinc-100">历史记录</div>
          <div className="mt-1 text-sm text-zinc-400">最近 {items.length} 条，适合展会快速复演</div>
        </div>

        {items.length === 0 ? (
          <GlassPanel glow className="mt-6 p-8 text-center">
            <div className="text-sm text-zinc-400">暂无记录</div>
            <div className="mt-4">
              <Link to="/demo">
                <Button variant="primary">去体验页</Button>
              </Link>
            </div>
          </GlassPanel>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <GlassPanel key={it.id} glow className="overflow-hidden">
                <div className="aspect-video w-full bg-black/30">
                  {it.fileType === 'video' && canPlayVideoPreview(it.previewUrl) ? (
                    <video className="h-full w-full object-cover" src={it.previewUrl} muted playsInline />
                  ) : (
                    <img className="h-full w-full object-cover" src={it.previewUrl} alt="thumb" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">{modeLabel(it.mode)} · {it.fileType === 'video' ? '视频' : '图片'}</div>
                      <div className="mt-1 text-xs text-zinc-400">{formatTime(it.createdAt)}</div>
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                  </div>
                  <div className="mt-3 text-sm text-cyan-200/90">{it.result.summary}</div>
                  <div className="mt-4">
                    <Button variant="outline" className="w-full" onClick={() => replay(it)}>
                      回看复演
                    </Button>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
