import { memo } from "react"
import { Link } from "react-router-dom"
import type { EventItem } from "@/data/types"
import { Badge } from "@/components/ui/Badge"
import { Perforation, StubDate } from "@/components/ui/Perforation"
import { formatCurrency } from "@/lib/utils"

// An event printed as a ticket: photo and title on the body, date and price on the cream stub.
export const EventCard = memo(function EventCard({ event }: { event: EventItem }) {
  const hasTickets = event.tiers.length > 0 && event.priceFrom > 0
  const place = [event.venue, event.city].filter(Boolean).join(", ")
  const soldOut = event.status === "soldout"

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-colors duration-200 hover:border-border-strong"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <img
          src={event.image || "/placeholder.svg"}
          alt=""
          loading="lazy"
          className={
            "h-full w-full object-cover transition-[filter,transform] duration-500 group-hover:scale-[1.03] " +
            (soldOut ? "grayscale" : "")
          }
        />
        {event.category && event.category !== "Other" && (
          <Badge tone="neutral" className="absolute left-3 top-3 border-transparent bg-background/85 text-foreground">
            {event.category}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-5 pb-5 pt-4">
        <h3 className="type-print text-[1.65rem] group-hover:text-accent">{event.title}</h3>
        <p className="truncate text-sm text-muted">{place || "Venue to be announced"}</p>
      </div>

      <Perforation />

      <div className="paper flex items-end justify-between gap-3 px-5 pb-4 pt-4">
        <StubDate date={event.date} />
        <div className="flex flex-col items-end text-right">
          {soldOut ? (
            <span className="rounded-sm border-2 border-current px-1.5 pt-0.5 font-display text-base font-extrabold uppercase leading-none text-stamp -rotate-3">
              Sold out
            </span>
          ) : hasTickets ? (
            <>
              {event.status === "limited" ? (
                <span className="mb-1 rounded-sm border-2 border-current px-1 pt-0.5 font-display text-xs font-extrabold uppercase leading-none text-foil">
                  Almost gone
                </span>
              ) : (
                <span className="text-xs font-medium text-paper-muted">From</span>
              )}
              <span className="font-display text-2xl font-extrabold leading-none tabular-nums text-foil">
                {formatCurrency(event.priceFrom)}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-paper-muted">Tickets soon</span>
          )}
        </div>
      </div>
    </Link>
  )
})
