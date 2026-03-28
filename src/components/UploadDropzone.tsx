import { useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { FileUp } from 'lucide-react'

type Props = {
  accept: string
  label: string
  helper: string
  onPick: (file: File) => void
  disabled?: boolean
}

export default function UploadDropzone({ accept, label, helper, onPick, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const acceptLabel = useMemo(() => accept.split(',').map((s) => s.trim().replace('image/', '').replace('video/', '')).join(', '), [accept])

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center backdrop-blur-md transition-colors',
        !disabled && 'hover:border-cyan-400/40 hover:bg-cyan-500/10',
        disabled && 'cursor-not-allowed opacity-60'
      )}
      onClick={() => {
        if (!disabled) inputRef.current?.click()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (disabled) return
        const f = e.dataTransfer.files?.[0]
        if (f) onPick(f)
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cyan-200 transition-colors group-hover:bg-cyan-500/20 group-hover:text-cyan-300">
        <FileUp className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-medium text-zinc-200 group-hover:text-cyan-100">{label}</div>
      <div className="mt-1 text-[11px] text-zinc-400">{helper}</div>
      <div className="mt-3 text-[10px] text-zinc-500 opacity-80">{acceptLabel}</div>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.currentTarget.value = ''
        }}
      />
    </div>
  )
}

