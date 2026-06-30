import type { EventCategory, EventItem, EventStatus, TicketTier } from "@/data/types"

const eventTypeToCategory: Record<string, EventCategory> = {
  concert: "Concert",
  festival: "Festival",
  theater: "Theater",
  sports: "Sports",
  conference: "Conference",
  movie: "Movie",
  workshop: "Workshop",
}

const statusToEventStatus = (status?: string, remaining = 0): EventStatus => {
  if (status === "sold_out") return "soldout"
  if (status === "cancelled" || status === "completed" || status === "archived") return "soldout"
  if (remaining > 0 && remaining <= 20) return "limited"
  return "available"
}

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

const toDate = (value?: string, fallback?: string) => value || fallback || new Date().toISOString()

export function mapApiTicketToTier(ticket: any): TicketTier {
  const remaining = Number(ticket.availableSeats ?? 0)
  return {
    id: ticket.id || ticket._id,
    name: ticket.name || ticket.ticketName || ticket.category || "Standard Ticket",
    description: stripHtml(ticket.description || "Digital ticket with QR, barcode, and NFC check-in when supported."),
    price: Number(ticket.price || 0),
    perks: [
      "Digital ticket",
      "Unique QR/barcode",
      "Fast check-in support",
    ],
    remaining,
    badge: remaining <= 20 && remaining > 0 ? "Almost sold out" : undefined,
  }
}

export function mapApiEventToEventItem(apiEvent: any, apiTickets: any[] = []): EventItem {
  const tickets = apiTickets.filter((ticket) => {
    const eventId = ticket.eventId || ticket.event?._id || ticket.event?.id
    return String(eventId) === String(apiEvent.id || apiEvent._id)
  })
  const tiers = tickets.map(mapApiTicketToTier)
  const remaining = tiers.reduce((total, tier) => total + Number(tier.remaining || 0), 0)
  const priceFrom = tiers.length ? Math.min(...tiers.map((tier) => Number(tier.price || 0))) : 0
  const startDate = toDate(apiEvent.startsAt, apiEvent.date)
  const companyName = apiEvent.company?.name || apiEvent.organizerDetails?.name || "TicketStage"

  return {
    id: apiEvent.id || apiEvent._id,
    slug: apiEvent.slug || apiEvent.id || apiEvent._id,
    title: apiEvent.title || apiEvent.eventName || "Untitled event",
    artist: companyName,
    category: eventTypeToCategory[apiEvent.eventType] || "Other",
    date: startDate,
    doorsTime: apiEvent.admission?.gatesOpenAt || startDate,
    venue: apiEvent.location?.venue || "Venue to be announced",
    city: apiEvent.location?.city || "",
    country: apiEvent.location?.country || "Vietnam",
    image: apiEvent.coverImage || apiEvent.image || "/placeholder.svg",
    heroImage: apiEvent.coverImage || apiEvent.image || "/placeholder.svg",
    status: statusToEventStatus(apiEvent.status, remaining),
    popular: Boolean(apiEvent.stats?.views > 100 || apiEvent.stats?.soldTickets > 20),
    priceFrom,
    rating: 4.8,
    description: stripHtml(apiEvent.description || "Event information is being updated."),
    lineup: [companyName],
    tiers,
  }
}
