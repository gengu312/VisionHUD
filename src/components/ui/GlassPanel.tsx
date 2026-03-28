import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = HTMLAttributes<HTMLDivElement> & {
  glow?: boolean
}

export default function GlassPanel({ className, glow = false, ...props }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-zinc-950/35 backdrop-blur-md',
        glow && 'shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_40px_120px_rgba(34,211,238,0.07)]',
        className,
      )}
      {...props}
    />
  )
}

