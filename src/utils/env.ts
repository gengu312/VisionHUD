export function getViteEnv(name: string): string | undefined {
  const val = (import.meta.env as Record<string, unknown>)[name]
  if (typeof val === 'string' && val.trim().length > 0) return val
  return undefined
}

export function getMinimaxConfig() {
  const apiKey = getViteEnv('VITE_MINIMAX_API_KEY')
  const baseUrl = getViteEnv('VITE_MINIMAX_BASE_URL') ?? 'https://api.minimaxi.com/v1'
  const model = getViteEnv('VITE_MINIMAX_MODEL') ?? 'MiniMax-M2.7'
  const visionModel = getViteEnv('VITE_MINIMAX_VISION_MODEL') ?? 'MiniMax-Text-01'
  return { apiKey, baseUrl, model, visionModel }
}
