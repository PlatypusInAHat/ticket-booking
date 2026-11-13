import type { EventItem } from "@/data/types"
import { eventsAPI, ticketsAPI } from "@/services/api"
import { mapApiEventToEventItem } from "@/utils/eventMapper"

// A tiny in-memory cache so Home, Events and organizer pages share one catalog fetch.
// Fresh results are served instantly; stale ones are served while a background refresh runs.
const FRESH_MS = 60_000

type Entry = { at: number; events: EventItem[] }

const entries = new Map<string, Entry>()
const inflight = new Map<string, Promise<EventItem[]>>()

const keyOf = (params: Record<string, unknown>) => JSON.stringify(params)

async function fetchCatalog(params: Record<string, unknown>): Promise<EventItem[]> {
  const eventsResponse = await eventsAPI.getEvents({ limit: 100, ...params })
  const apiEvents: any[] = eventsResponse.data.data?.events || []

  // Newer catalog builds return ticketSummary on each event; older ones need the ticket list joined in.
  const hasSummary = apiEvents.length > 0 && apiEvents.every((event) => event.ticketSummary)
  if (hasSummary || apiEvents.length === 0) {
    return apiEvents.map((event) => mapApiEventToEventItem(event))
  }

  const ticketsResponse = await ticketsAPI.getAll({ limit: 100 })
  const apiTickets = ticketsResponse.data.data?.tickets || []
  return apiEvents.map((event) => mapApiEventToEventItem(event, apiTickets))
}

export function peekCatalog(params: Record<string, unknown> = {}): EventItem[] | null {
  return entries.get(keyOf(params))?.events ?? null
}

export function loadCatalog(params: Record<string, unknown> = {}, { force = false } = {}): Promise<EventItem[]> {
  const key = keyOf(params)
  const cached = entries.get(key)
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.events)

  const pending = inflight.get(key)
  if (pending) return pending

  const request = fetchCatalog(params)
    .then((events) => {
      entries.set(key, { at: Date.now(), events })
      return events
    })
    .finally(() => inflight.delete(key))

  inflight.set(key, request)
  return request
}
