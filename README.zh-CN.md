# VisionHUD

<p>
  <a href="./README.md"><img src="https://img.shields.io/badge/Docs-English-64748B?style=flat-square" alt="English" /></a>
  <a href="./README.zh-CN.md"><img src="https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-2563EB?style=flat-square" alt="简体中文" /></a>
</p>

> 原始开发时间：2026-03

AI 智能眼镜第一视角 HUD 浮层 Web 营销 Demo。用户上传图片或视频后，页面以智能眼镜 HUD 抬头显示浮层的方式叠加 AI 分析结果，呈现未来感、第一视角、可录屏的演示体验。

## 技术栈

- React 18 + TypeScript + Vite
- Tailwind CSS + Zustand + React Router
- Minimax AI 接口集成

## 快速开始

```bash
pnpm install
cp .env.example .env.local
# 在 .env.local 中填写 API Key
pnpm dev
```

更多需求背景见 [MVP-需求简版.md](./MVP-需求简版.md)。
