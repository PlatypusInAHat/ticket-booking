import { useMemo, useState } from "react"
import { useParams, Link } from "react-router-dom"
import {
  Calendar,
  Clock,
  MapPin,
  Star,
  Users,
  ChevronLeft,
  ShoppingBag,
  Check,
} from "lucide-react"
import { getEventBySlug, events } from "@/data/events"
import { StatusBadge, Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { SectionTitle } from "@/components/ui/SectionTitle"
import { TicketTierCard } from "@/components/TicketTierCard"
import { EventCard } from "@/components/EventCard"
import { formatCurrency, formatDate, formatTime } from "@/lib/utils"
import { useAppDispatch } from "@/store"
import { addToCart } from "@/store/cartSlice"

export function EventDetail() {
  const { slug } = useParams<{ slug: string }>()
  const event = slug ? getEventBySlug(slug) : undefined
  const dispatch = useAppDispatch()
  const soldOut = event?.status === "soldout"

  const [selectedTier, setSelectedTier] = useState(event?.tiers[0]?.id ?? "")
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const tier = useMemo(
    () => event?.tiers.find((t) => t.id === selectedTier),
    [event, selectedTier],
  )

  if (!event) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-32 text-center">
        <h1 className="font-display text-2xl font-bold">Event not found</h1>
        <p className="text-muted">We couldn&apos;t find the event you&apos;re looking for.</p>
        <Button to="/events">Browse all events</Button>
      </div>
    )
  }

  const related = events.filter((e) => e.id !== event.id && e.category === event.category).slice(0, 3)
  const total = (tier?.price ?? 0) * quantity

  const handleAdd = () => {
    if (!tier || soldOut) return
    dispatch(
      addToCart({
        eventId: event.id,
        eventTitle: event.title,
        eventImage: event.image,
        eventDate: event.date,
        venue: `${event.venue}, ${event.city}`,
        tierId: tier.id,
        tierName: tier.name,
        price: tier.price,
        quantity,
      }),
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  return (
    <>
      {/* Hero */}
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

          <div className="mt-28 flex flex-wrap items-center gap-2 sm:mt-40">
            <Badge tone="neutral" className="bg-background/70">
              {event.category}
            </Badge>
            {event.popular && <Badge tone="accent">Popular</Badge>}
            <StatusBadge status={event.status} />
          </div>

          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            {event.title}
          </h1>
          <p className="mt-3 text-lg text-muted">{event.artist}</p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <span className="flex items-center gap-2 text-muted">
              <Calendar className="h-4 w-4 text-accent" />
              {formatDate(event.date, { weekday: "long" })}
            </span>
            <span className="flex items-center gap-2 text-muted">
              <Clock className="h-4 w-4 text-accent" />
              Doors {formatTime(event.doorsTime)} &middot; Show {formatTime(event.date)}
            </span>
            <span className="flex items-center gap-2 text-muted">
              <MapPin className="h-4 w-4 text-accent" />
              {event.venue}, {event.city}
            </span>
            <span className="flex items-center gap-2 text-muted">
              <Star className="h-4 w-4 fill-accent text-accent" />
              {event.rating} rating
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          {/* Left */}
          <div className="flex flex-col gap-10">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">About this event</h2>
              <p className="mt-4 leading-relaxed text-pretty text-muted">{event.description}</p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Lineup</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {event.lineup.map((act) => (
                  <span
                    key={act}
                    className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm"
                  >
                    <Users className="h-4 w-4 text-accent" />
                    {act}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Choose your tickets</h2>
              <p className="mt-2 text-sm text-muted">
                Select a tier to compare what&apos;s included.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {event.tiers.map((t) => (
                  <TicketTierCard
                    key={t.id}
                    tier={t}
                    selected={selectedTier === t.id}
                    quantity={quantity}
                    soldOut={soldOut}
                    onSelect={() => {
                      setSelectedTier(t.id)
                      setQuantity(1)
                    }}
                    onQuantity={setQuantity}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right — sticky summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-2">Starting from</span>
                <StatusBadge status={event.status} />
              </div>
              <p className="mt-1 font-display text-3xl font-bold">
                {formatCurrency(event.priceFrom)}
              </p>

              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Selected</span>
                  <span className="font-medium">{tier?.name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Quantity</span>
                  <span className="font-medium">{quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Price each</span>
                  <span className="font-medium">{formatCurrency(tier?.price ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-xl font-bold text-accent">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Button
                className="mt-5 w-full"
                size="lg"
                onClick={handleAdd}
                disabled={soldOut}
              >
                {soldOut ? (
                  "Sold Out"
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
              {!soldOut && (
                <Button to="/cart" variant="ghost" size="sm" className="mt-2 w-full">
                  Go to checkout &rarr;
                </Button>
              )}
              <p className="mt-4 text-center text-xs text-muted-2">
                Secure checkout &middot; Instant digital tickets
              </p>
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-20">
            <SectionTitle eyebrow="You might also like" title="Similar events" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  )
}
