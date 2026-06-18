import { Link } from "react-router-dom"
import { Search, Sparkles, Star } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { events } from "@/data/events"

const featured = events[0]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={featured.heroImage || "/placeholder.svg"}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8 lg:pb-32 lg:pt-36">
        <div className="max-w-2xl animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Over 1,200 live events this season
          </span>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Book the nights you&apos;ll <span className="text-gradient-gold">never forget</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted">
            Concerts, festivals, sports, and shows — handpicked and ready to book in seconds.
            Premium seats, instant tickets, zero hassle.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/events" size="lg">
              <Search className="h-4 w-4" />
              Explore Events
            </Button>
            <Button to={`/events/${featured.slug}`} size="lg" variant="outline">
              See what&apos;s trending
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            {[
              { value: "500K+", label: "Tickets sold" },
              { value: "1,200+", label: "Live events" },
              { value: "4.9", label: "Avg. rating", icon: true },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="flex items-center gap-1 font-display text-2xl font-bold">
                  {stat.value}
                  {stat.icon && <Star className="h-4 w-4 fill-accent text-accent" />}
                </span>
                <span className="text-sm text-muted-2">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          to={`/events/${featured.slug}`}
          className="mt-14 hidden max-w-md items-center gap-4 rounded-2xl border border-border glass p-4 transition-colors hover:border-border-strong lg:flex"
        >
          <img
            src={featured.image || "/placeholder.svg"}
            alt={featured.title}
            className="h-16 w-16 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              Featured tonight
            </span>
            <p className="truncate font-display font-semibold">{featured.title}</p>
            <p className="truncate text-sm text-muted">
              {featured.venue}, {featured.city}
            </p>
          </div>
          <span className="text-accent">&rarr;</span>
        </Link>
      </div>
    </section>
  )
}
