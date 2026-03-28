import { cn } from '@/lib/utils'

export default function HudBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_20%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(70%_50%_at_20%_80%,rgba(56,189,248,0.14),transparent_55%),radial-gradient(70%_50%_at_90%_70%,rgba(99,102,241,0.10),transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute inset-0 hud-scan" />
      <div className="absolute -left-24 top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -right-28 bottom-8 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
    </div>
  )
}

