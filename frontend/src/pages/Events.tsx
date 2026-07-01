import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { EventCard } from "@/components/EventCard"
import { Button } from "@/components/ui/Button"
import type { EventCategory, EventItem } from "@/data/types"
import { cn } from "@/lib/utils"
import { eventsAPI, ticketsAPI } from "@/services/api"
import { mapApiEventToEventItem } from "@/utils/eventMapper"

type SortKey = "popular" | "price-asc" | "price-desc" | "date"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "date", label: "Event date" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
]

const baseCategories: Array<EventCategory | "All"> = [
  "All",
  "Concert",
  "Festival",
  "Theater",
  "Sports",
  "Conference",
  "Movie",
  "Workshop",
  "Other",
]

export function Events() {
  const [params, setParams] = useSearchParams()
  const activeCategory = params.get("category") ?? "All"
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("popular")
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setQuery("")
  }, [activeCategory])

  useEffect(() => {
    const controller = new AbortController()

    const loadEvents = async () => {
      setLoading(true)
      setError("")

      try {
        const [eventsResponse, ticketsResponse] = await Promise.all([
          eventsAPI.getEvents({ limit: 100 }, { signal: controller.signal }),
          ticketsAPI.getAll({ limit: 500 }, { signal: controller.signal }),
        ])

        const apiEvents = eventsResponse.data.data?.events || []
        const apiTickets = ticketsResponse.data.data?.tickets || []
        setEvents(apiEvents.map((event: any) => mapApiEventToEventItem(event, apiTickets)))
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return
        setError(err.response?.data?.message || "Could not load events.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadEvents()
    return () => controller.abort()
  }, [])

  const categories = useMemo(() => {
    const fromEvents = events.map((event) => event.category)
    return Array.from(new Set([...baseCategories, ...fromEvents]))
  }, [events])

  const setCategory = (cat: string) => {
    const next = new URLSearchParams(params)
    if (cat === "All") next.delete("category")
    else next.set("category", cat)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    let list = events.slice()
    if (activeCategory !== "All") list = list.filter((event) => event.category === activeCategory)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (event) =>
          event.title.toLowerCase().includes(q) ||
          event.artist.toLowerCase().includes(q) ||
          event.city.toLowerCase().includes(q) ||
          event.venue.toLowerCase().includes(q),
      )
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.priceFrom - b.priceFrom)
        break
      case "price-desc":
        list.sort((a, b) => b.priceFrom - a.priceFrom)
        break
      case "date":
        list.sort((a, b) => +new Date(a.date) - +new Date(b.date))
        break
      default:
        list.sort((a, b) => Number(b.popular) - Number(a.popular) || b.rating - a.rating)
    }
    return list
  }, [activeCategory, events, query, sort])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {activeCategory === "All" ? "All events" : activeCategory}
        </h1>
        <p className="max-w-xl leading-relaxed text-muted">
          Discover events now on sale, filter by category, and book digital tickets in just a few steps.
        </p>
      </div>

      <div className="sticky top-16 z-30 -mx-4 mt-8 border-y border-border bg-background/80 px-4 py-4 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by event, organizer, city..."
              className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-10 text-sm text-foreground placeholder:text-muted-2 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="hidden h-4 w-4 text-muted-2 sm:block" />
            <label htmlFor="sort" className="sr-only">
              Sort events
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-11 rounded-full border border-border bg-surface px-4 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {sortOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                activeCategory === cat
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted hover:border-border-strong hover:text-foreground",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-96 animate-pulse rounded-[var(--radius-card)] border border-border bg-surface" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-16 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-400">
          {error}
        </div>
      ) : filtered.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted-2">
            <Search className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">No events found</p>
            <p className="mt-1 text-sm text-muted">Try another keyword or category.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery("")
              setCategory("All")
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
