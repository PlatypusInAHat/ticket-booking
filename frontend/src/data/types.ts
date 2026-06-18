export type EventCategory =
  | "Concert"
  | "Festival"
  | "Theater"
  | "Sports"
  | "Comedy"
  | "Conference"

export type EventStatus = "available" | "limited" | "soldout"

export interface TicketTier {
  id: string
  name: string
  description: string
  price: number
  perks: string[]
  remaining: number
  badge?: string
}

export interface EventItem {
  id: string
  slug: string
  title: string
  artist: string
  category: EventCategory
  date: string // ISO
  doorsTime: string // ISO
  venue: string
  city: string
  country: string
  image: string
  heroImage: string
  status: EventStatus
  popular: boolean
  priceFrom: number
  rating: number
  description: string
  lineup: string[]
  tiers: TicketTier[]
}
