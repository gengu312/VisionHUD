import type { HudCard } from '@/types/demo'
import { cn } from '@/lib/utils'

function typeTone(type: HudCard['type']) {
  if (type === 'success') return 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
  if (type === 'warning') return 'border-amber-300/25 bg-amber-500/10 text-amber-100'
  return 'border-cyan-300/25 bg-cyan-500/10 text-cyan-100'
}

export default function HudCardList({ cards }: { cards: HudCard[] }) {
  return (
    <div className="space-y-2">
      {cards.map((c) => (
        <div key={c.id} className={cn('rounded-xl border p-3 backdrop-blur-md', typeTone(c.type))}>
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-semibold text-zinc-50">{c.title}</div>
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
          </div>
          <div className="mt-1 text-xs leading-relaxed text-zinc-100/90">{c.body}</div>
          {c.actionLabel ? (
            <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-100/80">
              {c.actionLabel}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

