import { useCallback, useEffect, useState } from "react"
import type { EventItem } from "@/data/types"
import { eventsAPI, ticketsAPI } from "@/services/api"
import { mapApiEventToEventItem } from "@/utils/eventMapper"

const CACHE_TTL_MS = 30_000
const catalogCache: { events: EventItem[]; expiresAt: number } = { events: [], expiresAt: 0 }
let catalogRequest: Promise<EventItem[]> | null = null

async function requestCatalog() {
  if (catalogCache.expiresAt > Date.now()) return catalogCache.events
  if (!catalogRequest) {
    catalogRequest = Promise.all([
      eventsAPI.getEvents({ limit: 100 }),
      ticketsAPI.getAll({ limit: 100 }),
    ])
      .then(([eventsResponse, ticketsResponse]) => {
        const apiEvents = eventsResponse.data.data?.events || []
        const apiTickets = ticketsResponse.data.data?.tickets || []
        const events = apiEvents.map((event: any) => mapApiEventToEventItem(event, apiTickets))
        catalogCache.events = events
        catalogCache.expiresAt = Date.now() + CACHE_TTL_MS
        return events
      })
      .finally(() => {
        catalogRequest = null
      })
  }
  return catalogRequest
}

// Shares one short-lived catalog snapshot across Home and Events and deduplicates concurrent mounts.
export function useCatalogEvents() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadEvents = useCallback((signal?: AbortSignal) => {
      setLoading(true)
      setError("")
      return requestCatalog()
        .then((nextEvents) => setEvents(nextEvents))
        .catch((err: any) => {
          if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return
          setError(err.response?.data?.message || "We couldn't load events. Check your connection and try again.")
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false)
        })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadEvents(controller.signal)
    return () => controller.abort()
  }, [loadEvents])

  const refresh = useCallback(() => {
    catalogCache.expiresAt = 0
    const controller = new AbortController()
    loadEvents(controller.signal)
    return () => controller.abort()
  }, [loadEvents])

  return { events, loading, error, refresh }
}
