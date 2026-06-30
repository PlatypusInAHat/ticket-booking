export type EventCategory =
  | "Concert"
  | "Festival"
  | "Theater"
  | "Sports"
  | "Comedy"
  | "Conference"
  | "Movie"
  | "Workshop"
  | "Other"

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

export interface Seat {
  code: string;
  label: string;
  status: "available" | "held" | "sold" | "blocked";
}

export interface Row {
  label: string;
  seats: Seat[];
}

export interface Section {
  name: string;
  code: string;
  rows: Row[];
}

export interface SeatMap {
  mode: "general_admission" | "reserved_seating" | "zone_map";
  sections: Section[];
}

export interface Zone {
  id: string;
  name: string;
  tierId: string;
  color: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ZoneMap {
  backgroundImage: string;
  zones: Zone[];
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
  seatMap?: SeatMap
  zoneMap?: ZoneMap
}
