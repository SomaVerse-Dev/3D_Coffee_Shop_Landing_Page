export interface GalleryImage {
  url: string
  alt: string
  credit?: string
}

/**
 * Documentary-style interior photography for the template cards.
 * Generated to match each venue's mood (warm white / oat / charcoal palette).
 */
export const GALLERY_IMAGES: Record<'cafe' | 'coworking' | 'boutique' | 'restaurant', GalleryImage> = {
  cafe: {
    url: '/gallery/cafe.png',
    alt: 'Documentary photo of a cozy specialty coffee shop with wooden counter and espresso machine',
  },
  coworking: {
    url: '/gallery/coworking.png',
    alt: 'Documentary photo of a co-working studio with oak desk clusters and plants',
  },
  boutique: {
    url: '/gallery/boutique.png',
    alt: 'Documentary photo of a boutique clothing store with rails and display tables',
  },
  restaurant: {
    url: '/gallery/restaurant.png',
    alt: 'Documentary photo of a small bistro with booths and pendant lights',
  },
}
