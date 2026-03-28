import type { DemoMode } from '@/types/demo'
import { cn } from '@/lib/utils'

const MODES: { key: DemoMode; label: string; hint: string }[] = [
  { key: 'translate', label: '翻译', hint: '所见即翻译' },
  { key: 'travel', label: '出行', hint: '方向与路况辅助' },
  { key: 'office', label: '办公', hint: '摘要与待办' },
  { key: 'business', label: '商务', hint: '名片/身份提取' },
  { key: 'object', label: '识物', hint: '识别与推荐' },
]

export default function ModeSelector({ value, onChange }: { value: DemoMode; onChange: (m: DemoMode) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {MODES.map((m) => {
        const active = value === m.key
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={cn(
              'group rounded-lg border px-2 py-2 text-left transition',
              active
                ? 'border-cyan-300/50 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
                : 'border-white/10 bg-white/0 hover:bg-white/5 hover:border-white/20',
            )}
          >
            <div className={cn('text-sm font-semibold', active ? 'text-cyan-200' : 'text-zinc-100')}>{m.label}</div>
            <div className={cn('mt-0.5 text-[11px] leading-tight', active ? 'text-cyan-200/70' : 'text-zinc-400')}>{m.hint}</div>
          </button>
        )
      })}
    </div>
  )
}

