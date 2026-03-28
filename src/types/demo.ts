export type DemoMode = 'translate' | 'travel' | 'office' | 'business' | 'object'

export type HudCardType = 'info' | 'success' | 'warning'

export type HudCard = {
  id: string
  type: HudCardType
  title: string
  body: string
  actionLabel?: string
}

export type AnalyzeScene = {
  name: string
  confidence?: number
  description?: string
}

export type AnalyzeMeta = {
  source: 'minimax' | 'mock'
  provider: 'MiniMax' | 'Local Demo'
  model?: string
  overlayMode: 'semantic' | 'mock'
  note?: string
}

export type AnalyzeTimelineItem = {
  t: number
  cards: HudCard[]
}

export type AnalyzeHighlightKind = 'text' | 'object' | 'person' | 'ui' | 'unknown'

export type AnalyzeHighlight = {
  id: string
  label: string
  kind?: AnalyzeHighlightKind
  x: number
  y: number
  w: number
  h: number
  confidence?: number
}

export type AnalyzeResult = {
  mode: DemoMode
  summary: string
  scene?: AnalyzeScene
  ocrText?: string
  cards: HudCard[]
  highlights?: AnalyzeHighlight[]
  timeline?: AnalyzeTimelineItem[]
  meta?: AnalyzeMeta
}

export type HistoryItem = {
  id: string
  createdAt: number
  fileType: 'image' | 'video'
  fileName: string
  previewUrl: string
  mode: DemoMode
  result: AnalyzeResult
}
