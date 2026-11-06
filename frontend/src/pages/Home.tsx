import { useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, ArrowUpRight, CalendarX } from "lucide-react"
import { Hero } from "@/components/home/Hero"
import { EventCard } from "@/components/EventCard"
import { SectionTitle } from "@/components/ui/SectionTitle"
import { Button } from "@/components/ui/Button"
import { Perforation } from "@/components/ui/Perforation"
import { useCatalogEvents } from "@/hooks/useCatalogEvents"
import type { EventItem } from "@/data/types"
import { notificationsAPI } from "@/services/api"

const categories = ["Concert", "Festival", "Sports", "Theater", "Conference", "Workshop"]

const steps = [
  {
    title: "Pick your tickets",
    desc: "Choose a ticket tier and quantity. Your tickets are held while you complete payment.",
  },
  {
    title: "Pay your way",
    desc: "Check out with VNPay or MoMo. Your booking is confirmed the moment payment clears.",
  },
  {
    title: "Walk straight in",
    desc: "Every ticket gets its own QR code and barcode, ready in your account for check-in at the gate.",
  },
]

function EventGrid({ events, loading, count }: { events: EventItem[]; loading: boolean; count: number }) {
  if (loading) {
    return (
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="h-[24rem] animate-pulse rounded-[var(--radius-card)] border border-border bg-surface" />
        ))}
      </div>
    )
  }

  return (
    <div className={"mt-8 grid gap-5 sm:grid-cols-2 " + (events.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

export function Home() {
  const { events, loading, error } = useCatalogEvents()

  const upcoming = useMemo(() => {
    const now = Date.now()
    return events
      .filter((event) => event.status !== "soldout" && +new Date(event.date) >= now)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
  }, [events])

  const trending = useMemo(() => {
    const popular = upcoming.filter((event) => event.popular)
    return (popular.length >= 4 ? popular : [...popular, ...upcoming.filter((event) => !event.popular)]).slice(0, 4)
  }, [upcoming])

  const featured = trending[0]
  // The featured event already owns the hero ticket, so the grid leaves it out.
  const trendingGrid = trending.slice(1).concat(upcoming.filter((event) => !trending.includes(event))).slice(0, 4)
  const later = upcoming.filter((event) => event !== featured && !trendingGrid.includes(event)).slice(0, 8)
  const [newsletterEmail, setNewsletterEmail] = useState("")
  const [newsletterStatus, setNewsletterStatus] = useState<{ tone: "success" | "danger"; text: string } | null>(null)
  const [newsletterLoading, setNewsletterLoading] = useState(false)

  const subscribeNewsletter = async (event: FormEvent) => {
    event.preventDefault()
    setNewsletterLoading(true)
    setNewsletterStatus(null)

    try {
      await notificationsAPI.subscribe(newsletterEmail)
      setNewsletterStatus({ tone: "success", text: "You're on the list. New events land in your inbox first." })
      setNewsletterEmail("")
    } catch (error: any) {
      setNewsletterStatus({ tone: "danger", text: error.response?.data?.message || "We couldn't save your email. Please try again." })
    } finally {
      setNewsletterLoading(false)
    }
  }

  return (
    <>
      <Hero featured={featured} />

      {error ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-16 text-center">
            <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
            <div>
              <p className="type-print text-2xl">Events are unavailable right now</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </section>
      ) : !loading && upcoming.length === 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-16 text-center">
            <CalendarX className="h-8 w-8 text-muted-2" aria-hidden="true" />
            <div>
              <p className="type-print text-2xl">No upcoming events yet</p>
              <p className="mt-1 text-sm text-muted">New events appear here as soon as organizers open ticket sales.</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle title="Trending events" description="The events people are booking right now." />
            <Button to="/events" variant="ghost" size="sm" className="hidden sm:inline-flex">
              View all events
            </Button>
          </div>
          <EventGrid events={trendingGrid} loading={loading} count={4} />
        </section>
      )}

      <nav aria-label="Browse by category" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-sm font-medium text-muted">Browse by category</h2>
        <ul className="mt-4 grid grid-cols-1 gap-px border-y border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((name) => (
            <li key={name} className="bg-background">
              <Link
                to={`/events?category=${name}`}
                className="group flex items-center justify-between gap-4 px-1 py-5 transition-colors hover:bg-surface sm:px-5"
              >
                <span className="type-print text-4xl transition-colors group-hover:text-accent">{name}</span>
                <ArrowUpRight
                  className="h-5 w-5 text-muted-2 transition-colors group-hover:text-accent"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle title="From browsing to the front gate" />
        {/* The journey as one long ticket, each step a coupon torn off along a perforation. */}
        <ol className="mt-8 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface md:flex-row">
          {steps.map((step, index) => (
            <li key={step.title} className="contents">
              {index > 0 && (
                <>
                  <Perforation className="md:hidden" />
                  <Perforation orientation="vertical" className="hidden md:block" />
                </>
              )}
              <div className={index === steps.length - 1 ? "paper flex-1 p-6 md:p-8" : "flex-1 p-6 md:p-8"}>
                <h3 className="type-print text-3xl">{step.title}</h3>
                <p
                  className={
                    "mt-2 max-w-sm text-sm leading-relaxed " +
                    (index === steps.length - 1 ? "text-paper-muted" : "text-muted")
                  }
                >
                  {step.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {!error && (loading || later.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
          <SectionTitle title="Coming up" description="Lock in your spot before they sell out." />
          <EventGrid events={later} loading={loading} count={4} />
          <div className="mt-10 flex justify-center">
            <Button to="/events" variant="outline">
              See all events
            </Button>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface md:flex-row">
          <div className="flex-1 p-6 md:p-8">
            <h2 className="type-print text-4xl sm:text-5xl">First in line for new events</h2>
            <p className="mt-3 max-w-md text-pretty text-muted">
              Early-bird tickets, presales and new shows from organizers across Vietnam, straight to your inbox.
            </p>
          </div>
          <Perforation className="md:hidden" />
          <Perforation orientation="vertical" className="hidden md:block" />
          <form onSubmit={subscribeNewsletter} className="paper flex flex-col justify-center gap-3 p-6 md:w-[26rem] md:p-8">
            <label htmlFor="newsletter-email" className="text-sm font-semibold">
              Email address
            </label>
            <div className="flex gap-2">
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full min-w-0 rounded-md border border-paper-line bg-paper-2 px-4 text-sm text-paper-ink outline-none placeholder:text-paper-muted focus:border-foil"
              />
              <Button type="submit" size="lg" disabled={newsletterLoading}>
                {newsletterLoading ? "Saving…" : "Subscribe"}
              </Button>
            </div>
            {newsletterStatus && (
              <p
                className={newsletterStatus.tone === "success" ? "text-sm text-paper-ink" : "text-sm text-stamp"}
                role="status"
              >
                {newsletterStatus.text}
              </p>
            )}
          </form>
        </div>
      </section>
    </>
  )
}
