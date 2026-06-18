import { Link } from "react-router-dom"
import { Calendar, MapPin, Star } from "lucide-react"
import type { EventItem } from "@/data/types"
import { StatusBadge, Badge } from "@/components/ui/Badge"
import { formatCurrency, formatDate } from "@/lib/utils"

export function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      to={`/events/${event.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={event.image || "/placeholder.svg"}
          alt={event.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <Badge tone="neutral" className="bg-background/70">
            {event.category}
          </Badge>
          {event.popular && <Badge tone="accent">Popular</Badge>}
        </div>
        <div className="absolute bottom-3 right-3">
          <StatusBadge status={event.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-tight tracking-tight text-balance">
            {event.title}
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {event.rating}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-muted">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-2" />
            {formatDate(event.date)}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-2" />
            {event.venue}, {event.city}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-2">From</span>
            <span className="font-display text-xl font-semibold text-foreground">
              {formatCurrency(event.priceFrom)}
            </span>
          </div>
          <span className="text-sm font-medium text-accent transition-transform duration-200 group-hover:translate-x-0.5">
            View event &rarr;
          </span>
        </div>
      </div>
    </Link>
  )
}
