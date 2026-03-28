import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, History, Sparkles } from 'lucide-react'
import HudBackdrop from '@/components/HudBackdrop'
import GlassPanel from '@/components/ui/GlassPanel'
import Button from '@/components/ui/Button'
import ModeSelector from '@/components/ModeSelector'
import UploadDropzone from '@/components/UploadDropzone'
import HudMediaFrame from '@/components/HudMediaFrame'
import HudCardList from '@/components/HudCardList'
import { useDemoStore } from '@/store/demoStore'
import type { AnalyzeResult, DemoMode, HistoryItem } from '@/types/demo'
import { captureVideoFrameBase64, compressImageDataUrlToJpegBase64, fileToDataUrl } from '@/utils/files'
import { analyzeImage, buildMockResult } from '@/utils/analyze'
import { getMinimaxConfig } from '@/utils/env'

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function isAuthFailureMessage(message: string) {
  return message.includes('Minimax 鉴权失败')
}

function StatusLine({ status }: { status: 'idle' | 'uploading' | 'scanning' | 'done' | 'error' }) {
  const text =
    status === 'uploading'
      ? '上传中…'
      : status === 'scanning'
        ? '扫描中：理解画面 → 生成语义 HUD'
        : status === 'done'
          ? '分析完成，语义 HUD 已叠加'
          : status === 'error'
            ? '分析失败，请重试'
            : '等待上传'
  return <div className="text-xs text-zinc-400">{text}</div>
}

export default function Demo() {
  const {
    mode,
    setMode,
    status,
    setStatus,
    errorMessage,
    setErrorMessage,
    fileType,
    fileName,
    previewUrl,
    setMedia,
    result,
    setResult,
    addHistory,
    loadHistory,
  } = useDemoStore()

  const [uploadPct, setUploadPct] = useState(0)
  const minimaxConfig = getMinimaxConfig()
  const hasKey = !!minimaxConfig.apiKey
  const canAnalyze = !!previewUrl && (status === 'idle' || status === 'done' || status === 'error')
  const title = useMemo(() => (mode === 'translate' ? '翻译' : mode === 'travel' ? '出行' : mode === 'office' ? '办公' : mode === 'business' ? '商务' : '识物'), [mode])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  async function persistHistory(nextResult: AnalyzeResult) {
    if (!previewUrl || !fileType || !fileName) return

    const historyPreviewUrl =
      fileType === 'video'
        ? `data:image/jpeg;base64,${await (async () => {
            try {
              const videoFile = await fetch(previewUrl).then((x) => x.blob()).then((b) => new File([b], fileName))
              return await captureVideoFrameBase64(videoFile, 0.6)
            } catch {
              return ''
            }
          })()}`
        : previewUrl

    const item: HistoryItem = {
      id: nowId('h'),
      createdAt: Date.now(),
      fileType,
      fileName,
      previewUrl: historyPreviewUrl,
      mode,
      result: nextResult,
    }
    addHistory(item)
  }

  async function pickImage(f: File) {
    setErrorMessage(undefined)
    setResult(undefined)
    setStatus('uploading')
    setUploadPct(10)
    const url = await fileToDataUrl(f)
    setUploadPct(80)
    setMedia({ fileType: 'image', fileName: f.name, previewUrl: url })
    setUploadPct(100)
    setStatus('idle')
  }

  async function pickVideo(f: File) {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setErrorMessage(undefined)
    setResult(undefined)
    setStatus('uploading')
    setUploadPct(10)
    const url = URL.createObjectURL(f)
    setUploadPct(100)
    setMedia({ fileType: 'video', fileName: f.name, previewUrl: url })
    setStatus('idle')
  }

  async function runAnalyze() {
    if (!previewUrl || !fileType || !fileName) return
    setErrorMessage(undefined)
    setStatus('scanning')
    try {
      let r: AnalyzeResult
      if (!hasKey) {
        r = buildMockResult(mode)
      } else if (fileType === 'image') {
        const dataUrl = previewUrl.startsWith('data:') ? previewUrl : await fileToDataUrl(await fetch(previewUrl).then((x) => x.blob()).then((b) => new File([b], fileName)))
        const base64 = await compressImageDataUrlToJpegBase64(dataUrl, { maxSide: 1280, quality: 0.82 })
        r = await analyzeImage(mode, base64)
      } else {
        const videoFile = await fetch(previewUrl).then((x) => x.blob()).then((b) => new File([b], fileName))
        const base64 = await captureVideoFrameBase64(videoFile, 0.6)
        const first = await analyzeImage(mode, base64)
        r = {
          ...first,
          timeline: [
            { t: 0.5, cards: first.cards.slice(0, 2) },
            { t: 2.0, cards: first.cards.slice(2, 4) },
            { t: 3.5, cards: first.cards.slice(4) },
          ].filter((x) => x.cards.length > 0),
        }
      }

      setResult(r)
      setStatus('done')
      await persistHistory(r)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '分析失败'
      if (isAuthFailureMessage(msg)) {
        const fallback = buildMockResult(mode)
        setResult(fallback)
        setErrorMessage('Minimax 鉴权失败，已自动切换为本地演示结果。请更换有效的 MiniMax API Key 后重试。')
        setStatus('done')
        await persistHistory(fallback)
        return
      }
      setErrorMessage(msg)
      setStatus('error')
    }
  }

  function onModeChange(next: DemoMode) {
    setMode(next)
    if (previewUrl && fileType && fileName) {
      setResult(undefined)
      setStatus('idle')
      setErrorMessage(undefined)
    }
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <HudBackdrop />
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100">
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="text-sm text-zinc-200">
              当前模式：<span className="font-semibold text-cyan-200">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/history">
              <Button variant="outline" size="sm">
                <History className="h-4 w-4" />
                历史
              </Button>
            </Link>
            <Button variant="primary" size="sm" disabled={!canAnalyze} onClick={runAnalyze}>
              <Sparkles className="h-4 w-4" />
              开始分析
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <HudMediaFrame status={status} previewUrl={previewUrl} fileType={fileType} result={result} />
            <div className="mt-4 flex items-center justify-between gap-3">
              <StatusLine status={status} />
              {status === 'uploading' ? <div className="text-xs text-zinc-500">{uploadPct}%</div> : null}
            </div>
            {errorMessage ? <div className={`mt-2 text-xs ${status === 'done' ? 'text-amber-200' : 'text-rose-200'}`}>{errorMessage}</div> : null}
            {!hasKey ? (
              <div className="mt-3 text-xs text-amber-200/90">
                未配置 `VITE_MINIMAX_API_KEY`，当前展示本地语义 HUD 演示结果。
              </div>
            ) : null}
            {hasKey ? (
              <div className="mt-3 text-xs text-cyan-200/80">
                当前视觉模型：`{minimaxConfig.visionModel}`。这版 Demo 使用 MiniMax 生成语义层，再由前端排版 HUD 锚点。
              </div>
            ) : null}
          </div>

          <div className="col-span-12 lg:col-span-4">
            <GlassPanel className="p-4" glow>
              <div className="text-sm font-semibold text-zinc-100">模式切换</div>
              <div className="mt-3">
                <ModeSelector value={mode} onChange={onModeChange} />
              </div>

              <div className="mt-5 text-sm font-semibold text-zinc-100">上传素材</div>
              <div className="mt-3 space-y-3">
                <UploadDropzone
                  accept="image/png,image/jpeg"
                  label="上传图片"
                  helper="建议：第一视角街景/室内/名片/屏幕等"
                  onPick={pickImage}
                  disabled={status === 'scanning'}
                />
                <UploadDropzone
                  accept="video/mp4,video/quicktime"
                  label="上传视频"
                  helper="演示版：抽取首帧生成结果并按节奏弹卡片"
                  onPick={pickVideo}
                  disabled={status === 'scanning'}
                />
              </div>
            </GlassPanel>

            <GlassPanel className="mt-6 p-4" glow>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">HUD 交互</div>
                  <div className="mt-1 text-xs text-zinc-400">点选画面中的高亮框，贴边弹出可收起卡片</div>
                </div>
              </div>
              <div className="mt-4">
                {result ? (
                  <>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200">
                      <div className="text-[11px] text-zinc-400">摘要</div>
                      <div className="mt-1 font-medium text-cyan-200">{result.summary}</div>
                      {result.ocrText ? <div className="mt-2 text-[11px] text-zinc-300/90">OCR：{result.ocrText}</div> : null}
                      {result.meta ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                          <span>来源：{result.meta.provider}</span>
                          {result.meta.model ? <span>模型：{result.meta.model}</span> : null}
                          <span>模式：{result.meta.overlayMode === 'semantic' ? '语义叠层' : '演示叠层'}</span>
                        </div>
                      ) : null}
                      {result.meta?.note ? <div className="mt-2 text-[11px] text-zinc-400">{result.meta.note}</div> : null}
                      {result.highlights?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {result.highlights.slice(0, 5).map((highlight) => (
                            <span key={highlight.id} className="rounded-full border border-cyan-200/12 bg-cyan-400/8 px-2.5 py-1 text-[11px] text-cyan-100/85">
                              {highlight.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <HudCardList cards={result.cards} />
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-zinc-500">上传后点击“开始分析”</div>
                )}
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  )
}
