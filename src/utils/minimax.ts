import { getMinimaxConfig } from '@/utils/env'

export type MinimaxChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type MinimaxChatOptions = {
  model?: string
  temperature?: number
}

function formatMinimaxError(status: number, text: string) {
  const lower = text.toLowerCase()
  if (status === 401 && (lower.includes('invalid api key') || lower.includes('authorized_error'))) {
    return 'Minimax 鉴权失败：当前 API Key 无效，或不属于 api.minimax.io。请在 MiniMax 控制台重新创建可用于 Text Generation 的 API Key。'
  }
  if (status === 429) {
    return 'Minimax 请求过于频繁：当前额度或速率受限，请稍后重试。'
  }
  return `Minimax 请求失败：${status}${text ? ` - ${text}` : ''}`
}

export async function minimaxChatCompletion(messages: MinimaxChatMessage[], options?: MinimaxChatOptions): Promise<string> {
  const { apiKey, baseUrl, model } = getMinimaxConfig()
  if (!apiKey) throw new Error('未配置 VITE_MINIMAX_API_KEY')

  const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options?.model ?? model,
      messages,
      temperature: options?.temperature ?? 0.4,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(formatMinimaxError(resp.status, text))
  }

  const jsonUnknown: unknown = await resp.json().catch(() => null)
  const json = (jsonUnknown && typeof jsonUnknown === 'object' ? (jsonUnknown as Record<string, unknown>) : undefined) ?? undefined
  const baseResp = json?.base_resp
  if (baseResp && typeof baseResp === 'object') {
    const statusCode = (baseResp as Record<string, unknown>).status_code
    const statusMsg = (baseResp as Record<string, unknown>).status_msg
    if (typeof statusCode === 'number' && statusCode !== 0) {
      const msg = typeof statusMsg === 'string' && statusMsg.trim().length > 0 ? statusMsg.trim() : `status_code=${statusCode}`
      throw new Error(`Minimax 返回错误：${msg}`)
    }
  }
  const choices = (json?.choices as unknown) as unknown[] | undefined
  const first = Array.isArray(choices) ? choices[0] : undefined
  const message = first && typeof first === 'object' ? ((first as Record<string, unknown>).message as unknown) : undefined
  const content = message && typeof message === 'object' ? ((message as Record<string, unknown>).content as unknown) : undefined
  if (typeof content !== 'string' || !content.trim()) throw new Error('Minimax 返回为空')
  return content
}
