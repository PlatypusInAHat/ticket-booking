import { Link } from "react-router-dom"
import { Music, PartyPopper, Trophy, Drama, Mic, Presentation, ShieldCheck, Zap, RefreshCw } from "lucide-react"
import { Hero } from "@/components/home/Hero"
import { EventCard } from "@/components/EventCard"
import { SectionTitle } from "@/components/ui/SectionTitle"
import { Button } from "@/components/ui/Button"
import { events } from "@/data/events"

const categoryTiles = [
  { name: "Concert", icon: Music },
  { name: "Festival", icon: PartyPopper },
  { name: "Sports", icon: Trophy },
  { name: "Theater", icon: Drama },
  { name: "Comedy", icon: Mic },
  { name: "Conference", icon: Presentation },
]

const perks = [
  { icon: Zap, title: "Instant tickets", desc: "Digital tickets delivered the moment you check out — no waiting, no printing." },
  { icon: ShieldCheck, title: "Verified & secure", desc: "Every event is verified and every payment is protected end-to-end." },
  { icon: RefreshCw, title: "Easy refunds", desc: "Plans changed? Flexible refund options on eligible events, hassle-free." },
]

export function Home() {
  const trending = events.filter((e) => e.popular).slice(0, 4)
  const upcoming = events.slice(0, 8)

  return (
    <>
      <Hero />

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Browse"
          title="Find your scene"
          description="From sold-out arenas to intimate clubs, explore events across every category."
        />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categoryTiles.map((c) => {
            const Icon = c.icon
            return (
              <Link
                key={c.name}
                to={`/events?category=${c.name}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:bg-surface-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent transition-colors group-hover:bg-accent-soft">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-medium">{c.name}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <SectionTitle eyebrow="Hot right now" title="Trending events" />
          <Button to="/events" variant="ghost" size="sm" className="hidden sm:inline-flex">
            View all &rarr;
          </Button>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {perks.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.title}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{p.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Upcoming */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="On sale now"
          title="Upcoming events"
          description="Lock in your spot before they sell out."
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-10 text-center sm:p-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative">
            <SectionTitle
              align="center"
              eyebrow="Never miss out"
              title="Get first access to new drops"
              description="Join the list for early-bird tickets, exclusive presales, and curated picks."
              className="mx-auto items-center"
            />
            <form
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder="you@email.com"
                className="h-12 flex-1 rounded-full border border-border bg-background px-5 text-sm text-foreground placeholder:text-muted-2 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <Button size="lg" type="submit">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
