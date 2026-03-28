import type { AnalyzeHighlight, AnalyzeHighlightKind, AnalyzeResult, DemoMode, HudCard } from '@/types/demo'
import { getMinimaxConfig } from '@/utils/env'
import { minimaxChatCompletion } from '@/utils/minimax'

type SemanticFocusPoint = {
  label: string
  kind?: AnalyzeHighlightKind
  importance?: number
  cue?: string
  sourceText?: string
  translatedText?: string
  detail?: string
  actions?: string[]
}

type OverlayTemplate = {
  x: number
  y: number
  w: number
  h: number
}

function stripThinkTags(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

function extractJsonObject(text: string): string {
  const cleaned = stripThinkTags(text)
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first < 0 || last < 0 || last <= first) throw new Error('AI 输出未包含 JSON')
  return cleaned.slice(first, last + 1)
}

function safeId(prefix: string, idx: number) {
  return `${prefix}-${idx}-${Math.random().toString(16).slice(2, 8)}`
}

function clamp01(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function normalizeLabel(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.length > 18 ? `${cleaned.slice(0, 16)}…` : cleaned
}

function normalizeText(text: string, max = 48) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned
}

function normalizeCards(cards: unknown): HudCard[] {
  if (!Array.isArray(cards)) return []
  return cards
    .map((c, idx) => {
      if (!c || typeof c !== 'object') return null
      const obj = c as Record<string, unknown>
      const title = typeof obj.title === 'string' ? normalizeLabel(obj.title) : ''
      const body = typeof obj.body === 'string' ? obj.body.trim() : ''
      if (!title || !body) return null
      const rawType = obj.type
      const type = rawType === 'success' || rawType === 'warning' ? rawType : 'info'
      const rawActionLabel = typeof obj.actionLabel === 'string' ? obj.actionLabel.trim() : ''
      const actionLabel = rawActionLabel ? normalizeLabel(rawActionLabel) : undefined
      const id = typeof obj.id === 'string' ? obj.id : safeId('card', idx)
      return { id, type, title, body, actionLabel }
    })
    .filter(Boolean) as HudCard[]
}

function normalizeFocusPoints(points: unknown, legacyHighlights?: unknown): SemanticFocusPoint[] {
  const source = Array.isArray(points) ? points : Array.isArray(legacyHighlights) ? legacyHighlights : []
  return source
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const obj = item as Record<string, unknown>
      const label = typeof obj.label === 'string' ? normalizeLabel(obj.label) : ''
      if (!label) return null

      const rawKind = obj.kind
      const kind: AnalyzeHighlightKind =
        rawKind === 'text' || rawKind === 'object' || rawKind === 'person' || rawKind === 'ui' ? rawKind : 'unknown'

      const importance =
        typeof obj.importance === 'number' && Number.isFinite(obj.importance) ? Math.max(1, Math.min(5, Math.round(obj.importance))) : undefined
      const cue = typeof obj.cue === 'string' ? obj.cue.trim() : undefined
      const sourceText = typeof obj.sourceText === 'string' ? normalizeText(obj.sourceText, 42) : undefined
      const translatedText = typeof obj.translatedText === 'string' ? normalizeText(obj.translatedText, 42) : undefined
      const detail = typeof obj.detail === 'string' ? normalizeText(obj.detail, 72) : undefined
      const actions = Array.isArray(obj.actions)
        ? obj.actions
            .filter((value): value is string => typeof value === 'string')
            .map((value) => normalizeLabel(value))
            .filter(Boolean)
            .slice(0, 3)
        : undefined
      return { label, kind, importance, cue, sourceText, translatedText, detail, actions }
    })
    .filter(Boolean) as SemanticFocusPoint[]
}

function modeLabel(mode: DemoMode) {
  switch (mode) {
    case 'translate':
      return '翻译模式'
    case 'travel':
      return '出行模式'
    case 'office':
      return '办公模式'
    case 'business':
      return '商务模式'
    case 'object':
      return '识物模式'
  }
}

function buildSystemPrompt() {
  return [
    '你是一个 AI 眼镜 HUD 的语义分析器，目标是生成“像 AI 眼镜一样”的信息叠层。',
    '你不需要做精确目标检测，不要伪造像素级框选坐标。',
    '请根据用户提供的图片内容与指定模式，输出严格 JSON（不要 Markdown、不要代码块、不要额外解释）。',
    'JSON 结构必须符合：',
    '{',
    '  "mode": "translate|travel|office|business|object",',
    '  "summary": "一句短摘要，10-24 字",',
    '  "scene": {"name": "场景名", "confidence": 0.0-1.0, "description": "场景一句话"},',
    '  "ocrText": "图里真正可读到的关键短语，多个短语用 / 分隔，可为空",',
    '  "focusPoints": [{"label":"HUD短标签","kind":"text|object|person|ui","importance":1-5,"cue":"为什么值得提示，不超过16字","sourceText":"点选时显示的原文/元素名","translatedText":"翻译或转述结果","detail":"补充说明","actions":["按钮1","按钮2"]}],',
    '  "cards": [{"id":"...","type":"info|success|warning","title":"...","body":"...","actionLabel":"..."}]',
    '}',
    'focusPoints 返回 3-5 个，label 要短，尽量贴近画面里真正存在的元素或文字。',
    '翻译模式下，sourceText 和 translatedText 尽量填写；其他模式下 translatedText 可以是转述结果。',
    'cards 返回 3-4 张，title 不超过 12 字，body 不超过 28 字，像 AI 眼镜实时提醒。',
    '如果图中文字太小、看不清或不确定，请明确保守表达，不要编造具体专有名词。',
  ].join('\n')
}

function buildUserPrompt(mode: DemoMode) {
  const focus =
    mode === 'translate'
      ? '重点：像“所见即翻译”一样，提炼屏幕/文档/招牌上的核心文字，并给出中文提示。'
      : mode === 'travel'
        ? '重点：像出行 HUD 一样，提炼方向、路标、风险和下一步动作。'
        : mode === 'office'
          ? '重点：像办公 HUD 一样，把屏幕/文档内容压缩为摘要、待办和提醒。'
          : mode === 'business'
            ? '重点：像商务 HUD 一样，提炼身份、条款、联系人或谈判关键信息。'
            : '重点：像识物 HUD 一样，识别主要物品/设备并给出一句用途提示。'

  return [
    `当前模式：${mode}（${modeLabel(mode)}）`,
    focus,
    '请输出严格 JSON。',
    'focusPoints 只输出语义信息，不要坐标；系统会自己生成演示用 HUD 锚点。',
    '请识别并写入：scene.name / scene.description / summary / ocrText（如有）/ focusPoints / cards。',
    '图片数据在下方：',
  ].join('\n')
}

function deriveCards(summary: string, sceneName?: string, ocrText?: string, focusPoints: SemanticFocusPoint[] = []): HudCard[] {
  const cards: HudCard[] = []
  if (summary) {
    cards.push({ id: safeId('card', 0), type: 'success', title: 'AI 摘要', body: summary })
  }
  if (sceneName || focusPoints[0]?.cue) {
    cards.push({
      id: safeId('card', 1),
      type: 'info',
      title: sceneName ? `${normalizeLabel(sceneName)}识别` : '场景识别',
      body: focusPoints[0]?.cue || '已提炼当前画面的关键关注点。',
    })
  }
  if (ocrText) {
    cards.push({
      id: safeId('card', 2),
      type: 'info',
      title: '可读内容',
      body: ocrText,
      actionLabel: '继续查看',
    })
  }
  if (focusPoints[1]?.cue) {
    cards.push({
      id: safeId('card', 3),
      type: 'warning',
      title: normalizeLabel(focusPoints[1].label),
      body: focusPoints[1].cue,
    })
  }
  return cards.slice(0, 4)
}

function dedupeFocusPoints(points: SemanticFocusPoint[]) {
  const seen = new Set<string>()
  return points.filter((point) => {
    const key = point.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function splitOcrText(ocrText?: string) {
  if (!ocrText) return []
  return ocrText
    .split(/[\/|\n]/)
    .map((part) => normalizeLabel(part))
    .filter(Boolean)
}

function defaultActionsForMode(mode: DemoMode) {
  if (mode === 'translate') return ['翻译', '解释']
  if (mode === 'travel') return ['导航', '提醒']
  if (mode === 'office') return ['摘要', '待办']
  if (mode === 'business') return ['识别', '建议']
  return ['识别', '操作']
}

function buildFallbackDetail(mode: DemoMode, point: SemanticFocusPoint, fallbackCard?: HudCard) {
  if (point.detail) return point.detail
  if (point.cue) return point.cue
  if (fallbackCard?.body) return normalizeText(fallbackCard.body, 72)

  if (mode === 'translate') return `点选后可查看 ${point.label} 的翻译与解释。`
  if (mode === 'travel') return `点选后可查看 ${point.label} 的方向建议。`
  if (mode === 'office') return `点选后可查看 ${point.label} 的摘要与待办。`
  if (mode === 'business') return `点选后可查看 ${point.label} 的商务提示。`
  return `点选后可查看 ${point.label} 的识别说明。`
}

function buildFallbackTranslation(mode: DemoMode, point: SemanticFocusPoint, fallbackCard?: HudCard) {
  if (point.translatedText) return point.translatedText
  if (mode === 'translate' && point.cue) return normalizeText(point.cue, 42)
  if (fallbackCard?.body) return normalizeText(fallbackCard.body, 42)
  return point.label
}

function getOverlayTemplates(mode: DemoMode): OverlayTemplate[] {
  if (mode === 'translate' || mode === 'office' || mode === 'business') {
    return [
      { x: 0.08, y: 0.12, w: 0.34, h: 0.09 },
      { x: 0.10, y: 0.30, w: 0.48, h: 0.12 },
      { x: 0.10, y: 0.50, w: 0.54, h: 0.14 },
      { x: 0.10, y: 0.72, w: 0.42, h: 0.11 },
      { x: 0.08, y: 0.86, w: 0.30, h: 0.08 },
    ]
  }

  if (mode === 'travel') {
    return [
      { x: 0.12, y: 0.14, w: 0.24, h: 0.14 },
      { x: 0.54, y: 0.18, w: 0.22, h: 0.16 },
      { x: 0.18, y: 0.46, w: 0.28, h: 0.18 },
      { x: 0.56, y: 0.58, w: 0.20, h: 0.14 },
      { x: 0.28, y: 0.78, w: 0.24, h: 0.10 },
    ]
  }

  return [
    { x: 0.12, y: 0.16, w: 0.26, h: 0.16 },
    { x: 0.56, y: 0.18, w: 0.22, h: 0.14 },
    { x: 0.20, y: 0.48, w: 0.24, h: 0.18 },
    { x: 0.54, y: 0.58, w: 0.22, h: 0.16 },
    { x: 0.30, y: 0.80, w: 0.20, h: 0.10 },
  ]
}

function buildSemanticHighlights(mode: DemoMode, focusPoints: SemanticFocusPoint[], cards: HudCard[], ocrText?: string): AnalyzeHighlight[] {
  const derivedPoints = dedupeFocusPoints([
    ...focusPoints,
    ...splitOcrText(ocrText).map((label) => ({ label, kind: 'text' as const, importance: 3 })),
    ...cards.slice(0, 2).map((card) => ({ label: normalizeLabel(card.title), kind: 'ui' as const, importance: 2 })),
  ])

  const templates = getOverlayTemplates(mode)
  const points = derivedPoints.length
    ? derivedPoints
    : [{ label: mode === 'translate' ? '翻译目标' : 'HUD 焦点', kind: 'ui' as const, importance: 3 }]

  return points.slice(0, templates.length).map((point, idx) => {
    const template = templates[idx]
    const fallbackCard = cards[idx] ?? cards[0]
    return {
      id: safeId('hl', idx),
      label: point.label,
      kind: point.kind ?? 'unknown',
      x: clamp01(template.x),
      y: clamp01(template.y),
      w: clamp01(template.w),
      h: clamp01(template.h),
      confidence: clamp01(0.55 + ((point.importance ?? 3) - 1) * 0.08),
      sourceText: point.sourceText ?? point.label,
      translatedText: buildFallbackTranslation(mode, point, fallbackCard),
      detail: buildFallbackDetail(mode, point, fallbackCard),
      actions: point.actions && point.actions.length ? point.actions : defaultActionsForMode(mode),
    }
  })
}

function buildResultFromSemantic(params: {
  mode: DemoMode
  summary: string
  scene?: AnalyzeResult['scene']
  ocrText?: string
  focusPoints: SemanticFocusPoint[]
  cards: HudCard[]
  source: 'minimax' | 'mock'
  provider: 'MiniMax' | 'Local Demo'
  model?: string
  note: string
}): AnalyzeResult {
  const cards = params.cards.length ? params.cards : deriveCards(params.summary, params.scene?.name, params.ocrText, params.focusPoints)
  const finalCards: HudCard[] =
    cards.length > 0
      ? cards
      : [{ id: safeId('card', 0), type: 'info', title: 'HUD 提示', body: '已生成语义叠层。', actionLabel: '继续查看' }]

  return {
    mode: params.mode,
    summary: params.summary,
    scene: params.scene,
    ocrText: params.ocrText,
    cards: finalCards.slice(0, 4),
    highlights: buildSemanticHighlights(params.mode, params.focusPoints, finalCards, params.ocrText),
    meta: {
      source: params.source,
      provider: params.provider,
      model: params.model,
      overlayMode: params.source === 'minimax' ? 'semantic' : 'mock',
      note: params.note,
    },
  }
}

export async function analyzeImage(mode: DemoMode, imageBase64: string): Promise<AnalyzeResult> {
  const { visionModel } = getMinimaxConfig()
  const system = buildSystemPrompt()
  const user = `${buildUserPrompt(mode)}\n[Image base64:${imageBase64}]`
  const raw = await minimaxChatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { model: visionModel, temperature: 0.35 },
  )

  const jsonText = extractJsonObject(raw)
  const parsedUnknown: unknown = JSON.parse(jsonText)
  const parsed = parsedUnknown && typeof parsedUnknown === 'object' ? (parsedUnknown as Record<string, unknown>) : undefined

  const cards = normalizeCards(parsed?.cards)
  const focusPoints = normalizeFocusPoints(parsed?.focusPoints, parsed?.highlights)
  const summary = typeof parsed?.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : '语义分析完成'
  const scene =
    parsed?.scene && typeof parsed.scene === 'object' && parsed.scene !== null && typeof (parsed.scene as Record<string, unknown>)?.name === 'string'
      ? {
          name: (parsed.scene as Record<string, unknown>).name as string,
          confidence:
            typeof (parsed.scene as Record<string, unknown>).confidence === 'number' ? ((parsed.scene as Record<string, unknown>).confidence as number) : undefined,
          description:
            typeof (parsed.scene as Record<string, unknown>).description === 'string' ? ((parsed.scene as Record<string, unknown>).description as string) : undefined,
        }
      : undefined
  const ocrText = typeof parsed?.ocrText === 'string' && parsed.ocrText.trim() ? parsed.ocrText.trim() : undefined

  return buildResultFromSemantic({
    mode,
    summary,
    scene,
    ocrText,
    focusPoints,
    cards,
    source: 'minimax',
    provider: 'MiniMax',
    model: visionModel,
    note: '语义叠层由 MiniMax 生成，框选位置为演示锚点布局。',
  })
}

const MOCK_PRESETS: Record<
  DemoMode,
  {
    summary: string
    scene: { name: string; confidence: number; description: string }
    ocrText?: string
    focusPoints: SemanticFocusPoint[]
    cards: HudCard[]
  }
> = {
  translate: {
    summary: '文档关键信息已浮现',
    scene: { name: '文档翻译', confidence: 0.82, description: '检测到页面结构、标题与条款信息' },
    ocrText: 'WHEREAS / LIABILITY / SIGNATURE',
    focusPoints: [
      {
        label: '标题区',
        kind: 'text',
        importance: 5,
        cue: '优先锁定文档主题',
        sourceText: "What's NEW in TRAE",
        translatedText: 'TRAE 最新更新',
        detail: '更像页面总标题，适合先翻译成一句主题说明。',
        actions: ['翻译', '解释'],
      },
      {
        label: 'WHEREAS 条款',
        kind: 'text',
        importance: 4,
        cue: '适合先做整段摘要',
        sourceText: 'WHEREAS',
        translatedText: '鉴于条款 / 背景说明',
        detail: '通常用于说明合同背景与签署前提，点选后适合弹出一句中文解释。',
        actions: ['翻译', '摘要'],
      },
      {
        label: '责任条款',
        kind: 'text',
        importance: 4,
        cue: '需要单独高亮风险点',
        sourceText: 'LIABILITY / INDEMNIFICATION',
        translatedText: '责任与赔偿',
        detail: '这类条款适合用 warning 风格卡片提示用户先关注风险。',
        actions: ['翻译', '提醒'],
      },
      {
        label: '签署区',
        kind: 'ui',
        importance: 3,
        cue: '方便生成收尾提醒',
        sourceText: 'SIGNATURE',
        translatedText: '签署区域',
        detail: '点选后可弹出“签字 / 确认 / 继续查看”等动作型 HUD 卡片。',
        actions: ['翻译', '操作'],
      },
    ],
    cards: [
      { id: safeId('m', 1), type: 'success', title: '文档类型识别', body: '当前更像合同/协议页面，适合做条款速览。', actionLabel: '查看摘要' },
      { id: safeId('m', 2), type: 'info', title: 'WHEREAS 摘要', body: '建议先解释背景条款，再进入正文义务。', actionLabel: '翻译核心' },
      { id: safeId('m', 3), type: 'warning', title: '风险条款', body: '责任与赔偿内容值得单独浮层提示。', actionLabel: '标记风险' },
      { id: safeId('m', 4), type: 'info', title: '签署提醒', body: '末尾签署区适合加动作提示与确认步骤。', actionLabel: '继续查看' },
    ],
  },
  travel: {
    summary: '前方动线已生成建议',
    scene: { name: '出行导航', confidence: 0.79, description: '检测到路标、方向与潜在注意点' },
    ocrText: 'Gate / Exit / Platform',
    focusPoints: [
      { label: '方向标识', kind: 'text', importance: 5, cue: '先给出下一步动作', sourceText: 'Gate 12', translatedText: '前往 12 号登机口', detail: '适合直接弹出下一步方向。', actions: ['导航', '提醒'] },
      { label: '拥挤区域', kind: 'person', importance: 4, cue: '提醒减速或绕行', sourceText: 'Crowd', translatedText: '前方人流密集', detail: '点选后可给出减速或绕行建议。', actions: ['提醒', '绕行'] },
      { label: '目标入口', kind: 'object', importance: 4, cue: '适合做路线确认', sourceText: 'Exit', translatedText: '出口方向', detail: '可用作确认目标路径。', actions: ['导航', '确认'] },
      { label: '提示牌', kind: 'ui', importance: 3, cue: '补充信息层级', sourceText: 'Platform', translatedText: '站台信息', detail: '作为补充信息层很合适。', actions: ['摘要', '提醒'] },
    ],
    cards: [
      { id: safeId('m', 1), type: 'success', title: '路线确认', body: '主路径已锁定，可直接给出下一步方向。', actionLabel: '继续前进' },
      { id: safeId('m', 2), type: 'info', title: '关键标牌', body: '将可读路标压缩成一句导航提示。', actionLabel: '读取文字' },
      { id: safeId('m', 3), type: 'warning', title: '人流提醒', body: '在人群区域叠加减速或避让提示更像 HUD。', actionLabel: '查看风险' },
    ],
  },
  office: {
    summary: '屏幕内容已压缩成待办',
    scene: { name: '办公屏幕', confidence: 0.76, description: '检测到标题、正文与操作区' },
    ocrText: 'Roadmap / Pending / Next Step',
    focusPoints: [
      { label: '标题栏', kind: 'ui', importance: 5, cue: '先建立页面上下文', sourceText: 'Roadmap', translatedText: '路线图', detail: '点选后适合先给页面摘要。', actions: ['摘要', '待办'] },
      { label: '正文区', kind: 'text', importance: 4, cue: '适合生成简报摘要', sourceText: 'Pending Items', translatedText: '待处理事项', detail: '可压缩成一眼读懂的简报。', actions: ['摘要', '解释'] },
      { label: '待办项', kind: 'text', importance: 4, cue: '可直接转动作建议', sourceText: 'Next Step', translatedText: '下一步', detail: '适合直接转成动作按钮。', actions: ['待办', '提醒'] },
      { label: '操作区', kind: 'ui', importance: 3, cue: '补充下一步按钮', sourceText: 'Action', translatedText: '操作区域', detail: '点选后可给出继续处理建议。', actions: ['待办', '操作'] },
    ],
    cards: [
      { id: safeId('m', 1), type: 'success', title: '页面摘要', body: '适合将长内容压缩成一眼可读的 HUD 简报。', actionLabel: '查看摘要' },
      { id: safeId('m', 2), type: 'info', title: '待办提炼', body: '可从正文里抽出 2-3 个立即执行项。', actionLabel: '生成待办' },
      { id: safeId('m', 3), type: 'warning', title: '注意项', body: '对风险或阻塞信息做单独浮层更直观。', actionLabel: '标记重点' },
    ],
  },
  business: {
    summary: '商务信息已分层呈现',
    scene: { name: '商务识别', confidence: 0.8, description: '检测到身份、条款或联系人线索' },
    ocrText: 'Name / Company / Role',
    focusPoints: [
      { label: '身份信息', kind: 'person', importance: 5, cue: '优先建立人物标签', sourceText: 'Name', translatedText: '联系人姓名', detail: '适合第一时间形成名片卡。', actions: ['识别', '建议'] },
      { label: '公司字段', kind: 'text', importance: 4, cue: '方便生成联系人卡片', sourceText: 'Company', translatedText: '所属公司', detail: '可作为商务上下文补充。', actions: ['识别', '摘要'] },
      { label: '关键条款', kind: 'text', importance: 4, cue: '可转成谈判提醒', sourceText: 'Term', translatedText: '关键条件', detail: '适合叠加风险提醒。', actions: ['建议', '提醒'] },
      { label: '联络方式', kind: 'ui', importance: 3, cue: '适合动作按钮承接', sourceText: 'Contact', translatedText: '联络方式', detail: '点选后可延展为保存联系人等动作。', actions: ['识别', '操作'] },
    ],
    cards: [
      { id: safeId('m', 1), type: 'success', title: '身份识别', body: '可将人名、公司、职位压缩成一张联系人 HUD。', actionLabel: '生成名片' },
      { id: safeId('m', 2), type: 'info', title: '重点字段', body: '优先浮现最有用的商务信息，避免信息过载。', actionLabel: '查看字段' },
      { id: safeId('m', 3), type: 'warning', title: '谈判提醒', body: '若出现条款/条件，可叠加风险提示。', actionLabel: '标记重点' },
    ],
  },
  object: {
    summary: '目标物体已完成解读',
    scene: { name: '识物分析', confidence: 0.78, description: '检测到主要设备与可解释特征' },
    ocrText: 'Device / Model / Control',
    focusPoints: [
      { label: '主体设备', kind: 'object', importance: 5, cue: '锁定主要识别目标', sourceText: 'Device', translatedText: '主体设备', detail: '先展示设备名称，再补充一句用途。', actions: ['识别', '用途'] },
      { label: '控制区域', kind: 'ui', importance: 4, cue: '适合给出交互提示', sourceText: 'Control', translatedText: '控制区域', detail: '适合点选后给出“如何操作”。', actions: ['操作', '提醒'] },
      { label: '品牌信息', kind: 'text', importance: 3, cue: '可补充简短说明', sourceText: 'Model', translatedText: '型号信息', detail: '可做成补充说明层。', actions: ['识别', '说明'] },
      { label: '状态灯', kind: 'ui', importance: 3, cue: '增加实时感', sourceText: 'Status', translatedText: '状态提示', detail: '适合强化实时监测感。', actions: ['提醒', '状态'] },
    ],
    cards: [
      { id: safeId('m', 1), type: 'success', title: '物体识别', body: 'HUD 可先给出名称，再补充一句用途。', actionLabel: '查看用途' },
      { id: safeId('m', 2), type: 'info', title: '操作提示', body: '围绕按钮或控制区给出“下一步动作”更像眼镜助手。', actionLabel: '继续查看' },
      { id: safeId('m', 3), type: 'warning', title: '状态注意', body: '对状态灯或异常区域做醒目提醒更有临场感。', actionLabel: '标记状态' },
    ],
  },
}

export function buildMockResult(mode: DemoMode): AnalyzeResult {
  const preset = MOCK_PRESETS[mode]
  return buildResultFromSemantic({
    mode,
    summary: preset.summary,
    scene: preset.scene,
    ocrText: preset.ocrText,
    focusPoints: preset.focusPoints,
    cards: preset.cards,
    source: 'mock',
    provider: 'Local Demo',
    note: '当前为本地演示叠层，结构与动效会保持接近真实 AI HUD。',
  })
}
