import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Search } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Perforation, StubDate } from "@/components/ui/Perforation"
import type { EventItem } from "@/data/types"
import { formatCurrency } from "@/lib/utils"

// The featured ticket straddles the band's bottom edge: its top notch sits on the band, its bottom notch on the page.
function FeaturedTicket({ event }: { event: EventItem }) {
  const place = [event.venue, event.city].filter(Boolean).join(", ")
  const hasTickets = event.tiers.length > 0 && event.priceFrom > 0

  return (
    <article className="relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-strong bg-surface md:flex-row">
      <Link
        to={`/events/${event.slug}`}
        className="group relative block aspect-[16/9] overflow-hidden bg-surface-2 md:aspect-auto md:min-h-[22rem] md:flex-1"
      >
        <img
          src={event.heroImage || event.image || "/placeholder.svg"}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent px-5 pb-5 pt-16 sm:px-7 sm:pb-6">
          <h2 className="type-print text-4xl sm:text-5xl lg:text-6xl">{event.title}</h2>
          {event.artist && <p className="mt-2 text-sm text-muted">{event.artist}</p>}
        </div>
      </Link>

      <Perforation className="md:hidden" />
      <Perforation
        orientation="vertical"
        className="hidden md:block"
        groundClassName="bg-surface"
        endGroundClassName="bg-background"
      />

      <div className="paper flex flex-col gap-5 px-5 py-5 sm:px-7 md:w-80 md:py-7">
        <div className="flex items-start justify-between gap-3">
          <StubDate date={event.date} />
          <span className="rounded-sm border border-paper-line px-1.5 pt-0.5 font-display text-sm font-bold uppercase leading-none tracking-[0.04em] text-paper-muted">
            {event.category}
          </span>
        </div>
        <div className="text-sm">
          <p className="font-semibold">{event.venue || "Venue to be announced"}</p>
          {event.city && <p className="text-paper-muted">{event.city}</p>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-paper-line pt-4 md:flex-col md:items-stretch">
          <div>
            <p className="text-xs font-medium text-paper-muted">{hasTickets ? "Tickets from" : "Tickets"}</p>
            <p className="font-display text-3xl font-extrabold leading-none tabular-nums text-foil">
              {hasTickets ? formatCurrency(event.priceFrom) : "Soon"}
            </p>
          </div>
          <Button
            to={`/events/${event.slug}`}
            size="lg"
            aria-label={`Get tickets for ${event.title}${place ? `, ${place}` : ""}`}
          >
            Get tickets
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  )
}

export function Hero({ featured }: { featured?: EventItem }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/events?q=${encodeURIComponent(q)}` : "/events")
  }

  return (
    <section className="pb-14 lg:pb-20">
      <div className={featured ? "border-b border-border bg-surface pb-40 md:pb-48" : "border-b border-border bg-surface pb-14"}>
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          <h1 className="type-print text-[clamp(3rem,8vw,6rem)] leading-[0.88]">
            Book the nights
            <br />
            you&apos;ll never forget
          </h1>
          <p className="mt-5 max-w-xl text-pretty leading-relaxed text-muted">
            Concerts, festivals, sports and shows from organizers across Vietnam. Pay with VNPay or MoMo and get your
            e-ticket the moment payment clears.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-2 sm:flex-row" role="search">
            <label htmlFor="hero-search" className="sr-only">
              Search events
            </label>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2"
                aria-hidden="true"
              />
              <input
                id="hero-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by event, organizer or city"
                className="form-input h-12 bg-background pl-11 text-base"
              />
            </div>
            <Button type="submit" size="lg" variant="secondary">
              Search
            </Button>
            <Link
              to="/events"
              className="inline-flex h-12 items-center justify-center px-3 text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Browse all
            </Link>
          </form>
        </div>
      </div>

      {featured && (
        <div className="mx-auto -mt-32 max-w-7xl animate-fade-up px-4 sm:px-6 md:-mt-40 lg:px-8">
          <FeaturedTicket event={featured} />
        </div>
      )}
    </section>
  )
}
