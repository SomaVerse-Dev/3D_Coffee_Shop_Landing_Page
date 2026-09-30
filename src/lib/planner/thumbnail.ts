import type { LayoutSnapshot } from './store'
import { getItem } from './catalog'

/**
 * Draws a lightweight 2D plan preview of a layout onto a canvas
 * and returns a PNG data-URL (used as saved-layout thumbnails).
 */
export function renderThumbnail(s: LayoutSnapshot, px = 460): string {
  const { w, d } = s.room
  const pad = 0.9
  const scale = px / (w + pad * 2)
  const height = Math.round((d + pad * 2) * scale)

  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const toX = (x: number) => (x + w / 2 + pad) * scale
  const toY = (z: number) => (z + d / 2 + pad) * scale

  // paper
  ctx.fillStyle = '#FDFAF3'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2 m grid
  ctx.strokeStyle = '#ECE4D0'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let gx = 0; gx <= w; gx += 2) {
    const x = Math.round(toX(gx - w / 2)) + 0.5
    ctx.moveTo(x, toY(-d / 2))
    ctx.lineTo(x, toY(d / 2))
  }
  for (let gz = 0; gz <= d; gz += 2) {
    const y = Math.round(toY(gz - d / 2)) + 0.5
    ctx.moveTo(toX(-w / 2), y)
    ctx.lineTo(toX(w / 2), y)
  }
  ctx.stroke()

  // items
  for (const it of s.items) {
    const cat = getItem(it.id)
    if (!cat) continue
    ctx.save()
    ctx.translate(toX(it.x), toY(it.z))
    ctx.rotate(-it.rot)
    const wpx = cat.w * scale
    const dpx = cat.d * scale
    ctx.fillStyle = cat.brandable
      ? s.brandColor
      : cat.shape === 'counter'
        ? '#3A372F'
        : '#E7DFC9'
    ctx.strokeStyle = '#2E2B26'
    ctx.lineWidth = 1
    if (cat.shape === 'circle') {
      const r = Math.max(wpx, dpx) / 2
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else {
      const x = -wpx / 2
      const y = -dpx / 2
      const r = Math.min(5, wpx / 4)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + wpx, y, x + wpx, y + dpx, r)
      ctx.arcTo(x + wpx, y + dpx, x, y + dpx, r)
      ctx.arcTo(x, y + dpx, x, y, r)
      ctx.arcTo(x, y, x + wpx, y, r)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }

  // walls
  ctx.strokeStyle = '#2E2B26'
  ctx.lineWidth = 3.5
  ctx.strokeRect(toX(-w / 2), toY(-d / 2), w * scale, d * scale)

  return canvas.toDataURL('image/png')
}
