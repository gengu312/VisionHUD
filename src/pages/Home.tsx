import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Shield, Zap } from 'lucide-react'
import HudBackdrop from '@/components/HudBackdrop'
import GlassPanel from '@/components/ui/GlassPanel'
import Button from '@/components/ui/Button'

const FEATURES = [
  { title: '所见即翻译', desc: '第一视角图片/视频，一键生成翻译 HUD', icon: Sparkles },
  { title: '出行辅助', desc: '路标与方向理解，给出下一步建议', icon: Zap },
  { title: '商务识别', desc: '名片信息提取，生成联系人卡片', icon: Shield },
]

export default function Home() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <HudBackdrop />

      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-14">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg border border-cyan-300/25 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]" />
            <div>
              <div className="text-sm font-semibold text-zinc-100">VisionHUD</div>
              <div className="text-[11px] text-zinc-400">AI Glasses First-Person Demo</div>
            </div>
          </div>
          <Link to="/demo">
            <Button variant="primary" size="sm">
              立即体验
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7">
            <div className="text-xs font-semibold tracking-widest text-cyan-200/80">AI GLASSES HUD</div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-zinc-50 sm:text-4xl">
              戴上 AI 眼镜
              <span className="block text-cyan-200">看见世界的下一层信息</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">
              上传图片或短视频，快速模拟“第一视角 AI 辅助”。无需硬件接入，适合展会大屏、官网宣传、招商演示与录屏素材。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/demo">
                <Button variant="primary">
                  <Sparkles className="h-4 w-4" />
                  上传体验
                </Button>
              </Link>
              <Link to="/history">
                <Button variant="outline">历史回看</Button>
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <GlassPanel key={f.title} glow className="p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <f.icon className="h-4 w-4 text-cyan-200" />
                    {f.title}
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-zinc-400">{f.desc}</div>
                </GlassPanel>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <GlassPanel glow className="relative overflow-hidden p-6">
              <div className="text-sm font-semibold text-zinc-100">演示说明</div>
              <div className="mt-2 text-sm leading-relaxed text-zinc-300">
                这是一个以“可展示、可传播”为核心的营销 Demo：
                <div className="mt-3 space-y-2 text-xs text-zinc-400">
                  <div>1) 选择模式（翻译/出行/办公/商务/识物）</div>
                  <div>2) 上传图片或视频</div>
                  <div>3) 观看扫描仪式感动效</div>
                  <div>4) HUD 分层弹出结果卡片</div>
                </div>
              </div>
              <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-semibold text-cyan-200/90">提示</div>
                <div className="mt-1 text-xs text-zinc-300/90">如需真实 AI 输出，请在本地创建 `.env.local` 并配置 `VITE_MINIMAX_API_KEY`。</div>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  )
}
