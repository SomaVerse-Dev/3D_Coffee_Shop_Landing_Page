export const BRAND_PRESETS = [
  { hex: '#C05B2E', name: 'Terracotta' },
  { hex: '#2F6B4F', name: 'Forest' },
  { hex: '#8C3B54', name: 'Plum' },
  { hex: '#5C4433', name: 'Coffee' },
  { hex: '#B08D3E', name: 'Ochre' },
  { hex: '#6B7052', name: 'Olive' },
  { hex: '#7C2D2D', name: 'Oxblood' },
  { hex: '#3E5C58', name: 'Spruce' },
]

export function computedBrandName(hex: string): string {
  const found = BRAND_PRESETS.find((p) => p.hex.toLowerCase() === hex.toLowerCase())
  return found ? found.name : 'Custom'
}
