import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md'
}

export default function Button({ className, variant = 'primary', size = 'md', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-50 disabled:pointer-events-none'
  const sizes = size === 'sm' ? 'h-9 px-3' : 'h-10 px-4'
  const styles =
    variant === 'primary'
      ? 'bg-cyan-500/90 text-zinc-950 hover:bg-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_10px_30px_rgba(34,211,238,0.15)]'
      : variant === 'outline'
        ? 'bg-transparent text-zinc-100 border border-cyan-400/25 hover:border-cyan-300/50 hover:bg-cyan-500/10'
        : 'bg-transparent text-zinc-100 hover:bg-white/5'

  return <button className={cn(base, sizes, styles, className)} {...props} />
}

