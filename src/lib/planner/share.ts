import type { LayoutSnapshot } from './store'
import type { TemplateId } from './types'

/** URL-safe base64 encode of a layout snapshot (for ?plan= share links). */
export function encodeLayout(s: LayoutSnapshot): string {
  const json = JSON.stringify(s)
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeLayout(code: string): LayoutSnapshot | null {
  try {
    let b64 = code.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const raw = JSON.parse(json) as Partial<LayoutSnapshot> | null
    if (!raw || !Array.isArray(raw.items) || !raw.room || typeof raw.room.w !== 'number' || typeof raw.room.d !== 'number') {
      return null
    }
    return {
      room: { w: raw.room.w, d: raw.room.d },
      items: raw.items,
      brandColor: typeof raw.brandColor === 'string' ? raw.brandColor : '#C05B2E',
      projectName: typeof raw.projectName === 'string' ? raw.projectName : 'Shared plan',
      templateId: (raw.templateId as TemplateId | 'custom') ?? 'custom',
    }
  } catch {
    return null
  }
}

export function buildShareUrl(s: LayoutSnapshot): string {
  const code = encodeLayout(s)
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('plan', code)
  return url.toString()
}
