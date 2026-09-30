/** window event that opens the zone editor from anywhere (cost panel, tour, …) */
export const ZONE_EDITOR_EVENT = 'forma:zone-editor'

/** ask the toolbar to open the zone editor */
export function openZoneEditor(): void {
  window.dispatchEvent(new Event(ZONE_EDITOR_EVENT))
}
