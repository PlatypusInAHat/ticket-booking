import { useEffect, useMemo, useState } from "react"
import { useParams, Link } from "react-router-dom"
import {
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  MapPin,
  ShoppingBag,
  Users,
} from "lucide-react"
import type { EventItem } from "@/data/types"
import { StatusBadge, Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { SectionTitle } from "@/components/ui/SectionTitle"
import { Perforation, StubDate } from "@/components/ui/Perforation"
import { TicketTierCard } from "@/components/TicketTierCard"
import { SeatMap } from "@/components/SeatMap"
import { EventCard } from "@/components/EventCard"
import { formatCurrency, formatDate, formatTime } from "@/lib/utils"
import { useAppDispatch } from "@/store"
import { addToCart } from "@/store/cartSlice"
import { eventsAPI, ticketsAPI } from "@/services/api"
import { mapApiEventToEventItem } from "@/utils/eventMapper"

export function EventDetail() {
  // The route is /events/:id; the value is an event id or slug, both resolved by the catalog service.
  const { id: slug } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()

  const [event, setEvent] = useState<EventItem | null>(null)
  const [related, setRelated] = useState<EventItem[]>([])
  const [selectedTier, setSelectedTier] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    const loadEvent = async () => {
      if (!slug) {
        setError("Event code was not found.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError("")

      try {
        const eventResponse = await eventsAPI.getEventById(slug, { signal: controller.signal })
        const apiEvent = eventResponse.data.data
        const ticketsResponse = await ticketsAPI.getAll(
          { eventId: apiEvent.id || apiEvent._id, limit: 100 },
          { signal: controller.signal },
        )
        const apiTickets = ticketsResponse.data.data?.tickets || []
        const mappedEvent = mapApiEventToEventItem(apiEvent, apiTickets)
        setEvent(mappedEvent)
        setSelectedTier(mappedEvent.tiers[0]?.id || "")

        const [relatedResponse, catalogTicketsResponse] = await Promise.all([
          eventsAPI.getEvents({ eventType: apiEvent.eventType, limit: 4 }, { signal: controller.signal }),
          ticketsAPI.getAll({ limit: 100 }, { signal: controller.signal }),
        ])
        const catalogTickets = catalogTicketsResponse.data.data?.tickets || []
        const relatedEvents = (relatedResponse.data.data?.events || [])
          .filter((item: any) => String(item.id || item._id) !== String(mappedEvent.id))
          .slice(0, 3)
          .map((item: any) => mapApiEventToEventItem(item, catalogTickets))
        setRelated(relatedEvents)
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return
        setError(err.response?.data?.message || "Could not load event details.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadEvent()
    return () => controller.abort()
  }, [slug])

  const soldOut = event?.status === "soldout"
  const tier = useMemo(
    () => event?.tiers.find((item) => item.id === selectedTier) || event?.tiers[0],
    [event, selectedTier],
  )
  const effectiveQuantity = quantity
  const reservedSeating = tier?.seatMap?.mode === "reserved_seating"
  const checkoutQuantity = reservedSeating ? selectedSeats.length : effectiveQuantity
  const total = (tier?.price ?? 0) * checkoutQuantity

  const handleAdd = () => {
    if (!event || !tier || soldOut || checkoutQuantity === 0) return
    dispatch(
      addToCart({
        _id: tier.id,
        ticketId: tier.id,
        eventId: event.id,
        eventName: event.title,
        eventTitle: event.title,
        eventImage: event.image,
        eventDate: event.date,
        venue: `${event.venue}, ${event.city}`,
        tierId: tier.id,
        tierName: tier.name,
        category: tier.name,
        price: tier.price,
        availableSeats: tier.remaining || 1,
        quantity: checkoutQuantity,
        seatCodes: reservedSeating ? selectedSeats : [],
      }),
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="h-[520px] animate-pulse rounded-[var(--radius-card)] border border-border bg-surface" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-32 text-center">
        <h1 className="type-print text-4xl">Event not found</h1>
        <p className="text-muted">{error || "This event does not exist or is no longer on sale."}</p>
        <Button to="/events">View all events</Button>
      </div>
    )
  }

  return (
    <>
      <section className="relative">
        <div className="absolute inset-0 h-full">
          <img src={event.heroImage || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to events
          </Link>

          <h1 className="type-print mt-28 max-w-4xl text-[clamp(3rem,8vw,6rem)] leading-[0.88] sm:mt-40">
            {event.title}
          </h1>
          <p className="mt-3 text-lg text-muted">{event.artist}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <span className="flex items-center gap-2">
              {event.category && event.category !== "Other" && (
                <Badge tone="neutral" className="border-transparent bg-background/85 text-foreground">
                  {event.category}
                </Badge>
              )}
              <StatusBadge status={event.status} />
            </span>
            <span className="flex items-center gap-2 text-muted">
              <Calendar className="h-4 w-4 text-muted-2" aria-hidden="true" />
              {formatDate(event.date, { weekday: "long" })}
            </span>
            <span className="flex items-center gap-2 text-muted">
              <Clock className="h-4 w-4 text-muted-2" aria-hidden="true" />
              {event.doorsTime && formatTime(event.doorsTime) !== formatTime(event.date)
                ? `Doors ${formatTime(event.doorsTime)} · Starts ${formatTime(event.date)}`
                : `Starts ${formatTime(event.date)}`}
            </span>
            <span className="flex items-center gap-2 text-muted">
              <MapPin className="h-4 w-4 text-muted-2" aria-hidden="true" />
              {[event.venue, event.city].filter(Boolean).join(", ")}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-10">
            <div>
              <h2 className="type-print text-3xl">Event information</h2>
              <p className="mt-4 leading-relaxed text-pretty text-muted">{event.description}</p>
            </div>

            <div>
              <h2 className="type-print text-3xl">Organizer</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {event.lineup.map((act) => (
                  <span
                    key={act}
                    className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <Users className="h-4 w-4 text-muted-2" aria-hidden="true" />
                    {act}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="type-print text-3xl">Choose your tickets</h2>
              <p className="mt-2 text-sm text-muted">
                Every paid ticket includes its own QR code and barcode for check-in.
              </p>
              {event.tiers.length > 0 ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Ticket tiers">
                  {event.tiers.map((item) => (
                    <TicketTierCard
                      key={item.id}
                      tier={item}
                      selected={selectedTier === item.id}
                      quantity={quantity}
                      soldOut={soldOut || item.remaining <= 0}
                      onSelect={() => {
                        setSelectedTier(item.id)
                        setQuantity(1)
                        setSelectedSeats([])
                      }}
                      onQuantity={setQuantity}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-border bg-surface p-8 text-center text-muted">
                  This event is not selling tickets yet.
                </div>
              )}
              {reservedSeating && tier?.seatMap?.sections?.length ? (
                <div className="mt-6">
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    Select {Math.min(10, tier.remaining)} available seats
                  </p>
                  <SeatMap
                    key={tier.id}
                    sections={tier.seatMap.sections}
                    maxSelectable={Math.min(10, tier.remaining)}
                    onSelectionChange={setSelectedSeats}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
              <div className="px-6 pb-5 pt-6">
                <StubDate date={event.date} />
                <p className="mt-3 text-sm text-muted">{[event.venue, event.city].filter(Boolean).join(", ")}</p>
              </div>
              <Perforation />
              <div key={added ? "torn" : "whole"} className={"paper px-6 pb-6 pt-5" + (added ? " animate-stub-tear" : "")}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-paper-muted">From</span>
                {soldOut && (
                  <span className="rounded-sm border-2 border-current px-1.5 pt-0.5 font-display text-base font-extrabold uppercase leading-none text-stamp">
                    Sold out
                  </span>
                )}
              </div>
              <p className="font-display text-4xl font-extrabold leading-none tabular-nums text-foil">
                {event.tiers.length > 0 ? formatCurrency(event.priceFrom) : "To be announced"}
              </p>

              <div className="mt-5 flex flex-col gap-3 border-t border-paper-line pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-paper-muted">Selected</span>
                  <span className="font-semibold">{tier?.name ?? "No ticket available"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-paper-muted">Quantity</span>
                  <span className="font-semibold tabular-nums">{tier ? checkoutQuantity : 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-paper-muted">Price per ticket</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(tier?.price ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t-2 border-dashed border-paper-line pt-3 text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-3xl font-extrabold leading-none tabular-nums text-foil">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Button
                className="mt-5 w-full"
                size="lg"
                onClick={handleAdd}
                disabled={soldOut || !tier || tier.remaining <= 0 || (reservedSeating && selectedSeats.length === 0)}
              >
                {soldOut || !tier || tier.remaining <= 0 ? (
                  "Sold out"
                ) : reservedSeating && selectedSeats.length === 0 ? (
                  "Select seats"
                ) : added ? (
                  <>
                    <Check className="h-4 w-4" />
                    Added to cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    Add to cart
                  </>
                )}
              </Button>
              {!soldOut && tier && (
                <Link
                  to="/cart"
                  className="mt-3 block text-center text-sm font-medium text-paper-ink underline underline-offset-4 hover:text-foil"
                >
                  View cart
                </Link>
              )}
              <p className="mt-4 text-center text-xs text-paper-muted">
                Secure checkout · Instant digital tickets
              </p>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mt-20">
            <SectionTitle title="You may also like" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <EventCard key={item.id} event={item} />
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  )
}
