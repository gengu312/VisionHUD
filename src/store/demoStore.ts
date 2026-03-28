import { create } from 'zustand'
import type { AnalyzeResult, DemoMode, HistoryItem } from '@/types/demo'

type AnalyzeStatus = 'idle' | 'uploading' | 'scanning' | 'done' | 'error'

type DemoState = {
  mode: DemoMode
  setMode: (mode: DemoMode) => void

  status: AnalyzeStatus
  setStatus: (status: AnalyzeStatus) => void
  errorMessage?: string
  setErrorMessage: (msg?: string) => void

  fileType?: 'image' | 'video'
  fileName?: string
  previewUrl?: string
  setMedia: (m: { fileType: 'image' | 'video'; fileName: string; previewUrl: string } | undefined) => void

  result?: AnalyzeResult
  setResult: (r: AnalyzeResult | undefined) => void

  history: HistoryItem[]
  loadHistory: () => void
  addHistory: (item: HistoryItem) => void
  clearHistory: () => void
}

const HISTORY_KEY = 'visionhud_history_v1'
const HISTORY_LIMIT = 24

function safeReadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as HistoryItem[]) : []
  } catch {
    return []
  }
}

function safeWriteHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)))
  } catch {
    return
  }
}

export const useDemoStore = create<DemoState>((set, get) => ({
  mode: 'translate',
  setMode: (mode) => set({ mode }),

  status: 'idle',
  setStatus: (status) => set({ status }),
  errorMessage: undefined,
  setErrorMessage: (msg) => set({ errorMessage: msg }),

  fileType: undefined,
  fileName: undefined,
  previewUrl: undefined,
  setMedia: (m) => set(m ? { fileType: m.fileType, fileName: m.fileName, previewUrl: m.previewUrl } : { fileType: undefined, fileName: undefined, previewUrl: undefined }),

  result: undefined,
  setResult: (r) => set({ result: r }),

  history: [],
  loadHistory: () => set({ history: safeReadHistory() }),
  addHistory: (item) => {
    const next = [item, ...get().history].slice(0, HISTORY_LIMIT)
    safeWriteHistory(next)
    set({ history: next })
  },
  clearHistory: () => {
    safeWriteHistory([])
    set({ history: [] })
  },
}))

