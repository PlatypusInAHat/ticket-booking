import { useEffect, useState } from "react"
import type { EventItem } from "@/data/types"
import { eventsAPI, ticketsAPI } from "@/services/api"
import { mapApiEventToEventItem } from "@/utils/eventMapper"

// Loads the live catalog (events joined with their ticket tiers) once per mount.
export function useCatalogEvents() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    const loadEvents = async () => {
      setLoading(true)
      setError("")

      try {
        const [eventsResponse, ticketsResponse] = await Promise.all([
          eventsAPI.getEvents({ limit: 100 }, { signal: controller.signal }),
          ticketsAPI.getAll({ limit: 100 }, { signal: controller.signal }),
        ])

        const apiEvents = eventsResponse.data.data?.events || []
        const apiTickets = ticketsResponse.data.data?.tickets || []
        setEvents(apiEvents.map((event: any) => mapApiEventToEventItem(event, apiTickets)))
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return
        setError(err.response?.data?.message || "We couldn't load events. Check your connection and try again.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadEvents()
    return () => controller.abort()
  }, [])

  return { events, loading, error }
}
