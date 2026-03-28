import { useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { FileUp } from 'lucide-react'
import Button from '@/components/ui/Button'

type Props = {
  accept: string
  label: string
  helper: string
  onPick: (file: File) => void
  disabled?: boolean
}

export default function UploadDropzone({ accept, label, helper, onPick, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const acceptLabel = useMemo(() => accept.split(',').map((s) => s.trim()).join(' '), [accept])

  return (
    <div className={cn('rounded-xl border border-white/10 bg-zinc-950/35 p-4 backdrop-blur-md', disabled && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{label}</div>
          <div className="mt-1 text-xs text-zinc-400">{helper}</div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="h-4 w-4" />
          选择文件
        </Button>
      </div>

      <div
        className={cn(
          'mt-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/0 text-xs text-zinc-400 transition',
          !disabled && 'hover:border-cyan-300/40 hover:bg-cyan-500/5',
        )}
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
        <div className="text-center">
          <div className="text-zinc-300">拖拽到此处上传</div>
          <div className="mt-1 text-[11px] text-zinc-500">支持：{acceptLabel}</div>
        </div>
      </div>

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

