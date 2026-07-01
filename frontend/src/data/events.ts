import type { EventItem } from "./types"

function tiers(base: number, remaining: number) {
  return [
    {
      id: "ga",
      name: "General Admission",
      description: "Standing access to the main floor with full view of the stage.",
      price: base,
      perks: ["Main floor standing", "Access to all bars", "Digital ticket"],
      remaining: Math.round(remaining * 0.6),
    },
    {
      id: "premium",
      name: "Premium Seated",
      description: "Reserved seating in the prime viewing tier with a dedicated entrance.",
      price: Math.round(base * 1.9),
      perks: ["Reserved seat", "Fast-track entry", "Coat check", "Welcome drink"],
      remaining: Math.round(remaining * 0.3),
      badge: "Popular",
    },
    {
      id: "vip",
      name: "VIP Experience",
      description: "The ultimate package with backstage access and premium hospitality.",
      price: Math.round(base * 3.4),
      perks: [
        "Front-row reserved seat",
        "Backstage lounge access",
        "Complimentary food & drinks",
        "Exclusive merch bundle",
        "Meet & greet",
      ],
      remaining: Math.round(remaining * 0.1),
      badge: "Limited",
    },
  ]
}

export const events: EventItem[] = [
  {
    id: "1",
    slug: "neon-nights-festival",
    title: "Neon Nights Festival",
    artist: "Aurora Collective",
    category: "Festival",
    date: "2026-08-14T20:00:00",
    doorsTime: "2026-08-14T18:30:00",
    venue: "Skyline Park",
    city: "Los Angeles",
    country: "USA",
    image: "/events/neon-nights.png",
    heroImage: "/events/neon-nights.png",
    status: "limited",
    popular: true,
    priceFrom: 89,
    rating: 4.9,
    description:
      "Three stages, forty artists, and one unforgettable night under the city skyline. Neon Nights brings together the biggest names in electronic and indie music for a sensory experience like no other.",
    lineup: ["Aurora Collective", "Midnight Pulse", "Velvet Sky", "The Lumens", "Echo Park"],
    tiers: tiers(89, 1800),
    seatMap: {
      mode: "reserved_seating",
      sections: [
        {
          name: "Main Section",
          code: "MAIN",
          rows: [
            {
              label: "A",
              seats: [
                { code: "A-1", label: "1", status: "available" },
                { code: "A-2", label: "2", status: "available" },
                { code: "A-3", label: "3", status: "available" },
                { code: "A-4", label: "4", status: "sold" },
                { code: "A-5", label: "5", status: "sold" },
                { code: "A-6", label: "6", status: "available" },
              ]
            },
            {
              label: "B",
              seats: [
                { code: "B-1", label: "1", status: "available" },
                { code: "B-2", label: "2", status: "available" },
                { code: "B-3", label: "3", status: "held" },
                { code: "B-4", label: "4", status: "available" },
                { code: "B-5", label: "5", status: "available" },
                { code: "B-6", label: "6", status: "available" },
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: "2",
    slug: "golden-fields",
    title: "Golden Fields",
    artist: "Various Artists",
    category: "Festival",
    date: "2026-07-04T16:00:00",
    doorsTime: "2026-07-04T14:00:00",
    venue: "Meadowlands",
    city: "Austin",
    country: "USA",
    image: "/events/golden-fields.png",
    heroImage: "/events/golden-fields.png",
    status: "available",
    popular: true,
    priceFrom: 120,
    rating: 4.8,
    description:
      "A two-day open-air celebration of music, art, and community set against a golden-hour backdrop. Camp under the stars and wake up to sunrise sets from world-class performers.",
    lineup: ["The Wildwoods", "Sahara Bloom", "Northern Lights", "Solstice", "Field Theory"],
    tiers: tiers(120, 5000),
    zoneMap: {
      backgroundImage: "/events/golden-fields.png",
      zones: [
        {
          id: "z-ga",
          name: "General Admission",
          tierId: "ga",
          color: "#22c55e",
          coordinates: { x: 10, y: 50, width: 80, height: 40 }
        },
        {
          id: "z-premium",
          name: "Premium Viewing",
          tierId: "premium",
          color: "#eab308",
          coordinates: { x: 25, y: 30, width: 50, height: 18 }
        },
        {
          id: "z-vip",
          name: "VIP Pit",
          tierId: "vip",
          color: "#a855f7",
          coordinates: { x: 40, y: 15, width: 20, height: 13 }
        }
      ]
    }
  },
  {
    id: "3",
    slug: "the-grand-revival",
    title: "The Grand Revival",
    artist: "Royal Stage Company",
    category: "Theater",
    date: "2026-09-22T19:30:00",
    doorsTime: "2026-09-22T18:45:00",
    venue: "The Majestic",
    city: "New York",
    country: "USA",
    image: "/events/grand-theater.png",
    heroImage: "/events/grand-theater.png",
    status: "available",
    popular: false,
    priceFrom: 65,
    rating: 4.7,
    description:
      "A breathtaking revival of a timeless classic, performed by an award-winning ensemble in one of the most storied theaters in the world. An evening of drama, music, and pure spectacle.",
    lineup: ["Royal Stage Company", "The Majestic Orchestra"],
    tiers: tiers(65, 900),
  },
  {
    id: "4",
    slug: "championship-finals",
    title: "Championship Finals",
    artist: "City Hawks vs. Coastal Kings",
    category: "Sports",
    date: "2026-06-28T18:00:00",
    doorsTime: "2026-06-28T16:30:00",
    venue: "Pinnacle Arena",
    city: "Chicago",
    country: "USA",
    image: "/events/arena-finals.png",
    heroImage: "/events/arena-finals.png",
    status: "limited",
    popular: true,
    priceFrom: 140,
    rating: 4.9,
    description:
      "The season comes down to this. Witness history as two title contenders face off in a sold-out arena for the championship trophy. Every seat is on the edge.",
    lineup: ["City Hawks", "Coastal Kings"],
    tiers: tiers(140, 2200),
  },
  {
    id: "5",
    slug: "laugh-loft-live",
    title: "Laugh Loft Live",
    artist: "Marcus Reed",
    category: "Comedy",
    date: "2026-05-30T21:00:00",
    doorsTime: "2026-05-30T20:15:00",
    venue: "The Loft",
    city: "Seattle",
    country: "USA",
    image: "/events/laugh-loft.png",
    heroImage: "/events/laugh-loft.png",
    status: "soldout",
    popular: false,
    priceFrom: 45,
    rating: 4.6,
    description:
      "An intimate night of stand-up with one of comedy's sharpest voices. Expect razor-sharp wit, fresh material, and a room that won't stop laughing.",
    lineup: ["Marcus Reed", "Opening: Dana Cole"],
    tiers: tiers(45, 220),
  },
  {
    id: "6",
    slug: "future-summit-2026",
    title: "Future Summit 2026",
    artist: "Industry Leaders",
    category: "Conference",
    date: "2026-10-12T09:00:00",
    doorsTime: "2026-10-12T08:00:00",
    venue: "Innovation Center",
    city: "San Francisco",
    country: "USA",
    image: "/events/future-summit.png",
    heroImage: "/events/future-summit.png",
    status: "available",
    popular: false,
    priceFrom: 299,
    rating: 4.8,
    description:
      "Two days of keynotes, workshops, and networking with the people shaping the next decade of technology. Walk away with insights you can put to work immediately.",
    lineup: ["Keynote Speakers", "30+ Sessions", "Hands-on Workshops"],
    tiers: tiers(299, 1500),
  },
  {
    id: "7",
    slug: "midnight-jazz-sessions",
    title: "Midnight Jazz Sessions",
    artist: "The Blue Note Quartet",
    category: "Concert",
    date: "2026-06-15T22:00:00",
    doorsTime: "2026-06-15T21:00:00",
    venue: "Velvet Lounge",
    city: "New Orleans",
    country: "USA",
    image: "/events/midnight-jazz.png",
    heroImage: "/events/midnight-jazz.png",
    status: "limited",
    popular: true,
    priceFrom: 55,
    rating: 4.9,
    description:
      "An after-hours journey through soulful improvisation in an intimate candlelit lounge. Let the brass and keys carry you well past midnight.",
    lineup: ["The Blue Note Quartet", "Special Guests"],
    tiers: tiers(55, 180),
  },
  {
    id: "8",
    slug: "pulse-arena-tour",
    title: "Pulse Arena Tour",
    artist: "Kassis",
    category: "Concert",
    date: "2026-11-08T20:00:00",
    doorsTime: "2026-11-08T18:30:00",
    venue: "Pinnacle Arena",
    city: "Miami",
    country: "USA",
    image: "/events/pulse-arena.png",
    heroImage: "/events/pulse-arena.png",
    status: "available",
    popular: true,
    priceFrom: 99,
    rating: 4.8,
    description:
      "The world tour everyone's talking about lands in Miami for one explosive night. A full production of lights, sound, and pyrotechnics built around chart-topping anthems.",
    lineup: ["Kassis", "Support: Nova Ray"],
    tiers: tiers(99, 3000),
  },
]

export const categories: Array<EventItem["category"] | "All"> = [
  "All",
  "Concert",
  "Festival",
  "Theater",
  "Sports",
  "Comedy",
  "Conference",
]

export function getEventBySlug(slug: string) {
  return events.find((e) => e.slug === slug)
}
