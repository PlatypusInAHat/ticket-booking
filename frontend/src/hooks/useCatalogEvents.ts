import { useEffect, useState } from "react"
import type { EventItem } from "@/data/types"
import { loadCatalog, peekCatalog } from "@/lib/catalogCache"

// Live catalog for list pages. Cached results render immediately and refresh quietly in the background.
export function useCatalogEvents(params: Record<string, unknown> = {}) {
  const key = JSON.stringify(params)
  const cached = peekCatalog(params)
  const [events, setEvents] = useState<EventItem[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    const initial = peekCatalog(params)
    if (initial) {
      setEvents(initial)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setError("")

    loadCatalog(params)
      .then((next) => {
        if (active) setEvents(next)
      })
      .catch((err: any) => {
        if (active && !initial) {
          setError(err.response?.data?.message || "We couldn't load events. Check your connection and try again.")
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
    // params is serialised into key so callers can pass inline objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { events, loading, error }
}
