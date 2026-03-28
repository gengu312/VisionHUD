export async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('读取文件失败'))
        return
      }
      resolve(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf('base64,')
  if (idx < 0) throw new Error('不支持的文件格式')
  return dataUrl.slice(idx + 'base64,'.length)
}

export async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file)
  return dataUrlToBase64(dataUrl)
}

export async function compressImageDataUrlToJpegBase64(
  dataUrl: string,
  opts?: { maxSide?: number; quality?: number },
): Promise<string> {
  const maxSide = opts?.maxSide ?? 1280
  const quality = opts?.quality ?? 0.82

  const img = new Image()
  img.decoding = 'async'
  img.src = dataUrl
  await img.decode()

  const srcW = Math.max(1, img.naturalWidth || img.width || 1)
  const srcH = Math.max(1, img.naturalHeight || img.height || 1)
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
  const dstW = Math.max(1, Math.round(srcW * scale))
  const dstH = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = dstW
  canvas.height = dstH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('图片处理失败')
  ctx.drawImage(img, 0, 0, dstW, dstH)

  const out = canvas.toDataURL('image/jpeg', quality)
  const idx = out.indexOf('base64,')
  if (idx < 0) throw new Error('图片处理失败')
  return out.slice(idx + 'base64,'.length)
}

export async function captureVideoFrameBase64(videoFile: File, atSeconds: number): Promise<string> {
  const objectUrl = URL.createObjectURL(videoFile)
  try {
    const video = document.createElement('video')
    video.src = objectUrl
    video.muted = true
    video.playsInline = true
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('读取视频失败'))
    })

    const target = Math.min(Math.max(atSeconds, 0), Math.max(0, video.duration - 0.05))
    video.currentTime = target
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve()
      video.onerror = () => reject(new Error('抽帧失败'))
    })

    const canvas = document.createElement('canvas')
    const srcW = Math.max(1, Math.floor(video.videoWidth))
    const srcH = Math.max(1, Math.floor(video.videoHeight))
    const maxSide = 1280
    const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
    canvas.width = Math.max(1, Math.round(srcW * scale))
    canvas.height = Math.max(1, Math.round(srcH * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('抽帧失败')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86)
    const idx = dataUrl.indexOf('base64,')
    if (idx < 0) throw new Error('抽帧失败')
    return dataUrl.slice(idx + 'base64,'.length)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
