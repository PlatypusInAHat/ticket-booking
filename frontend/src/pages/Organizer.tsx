import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Globe, MapPin } from "lucide-react"
import { EventCard } from "@/components/EventCard"
import { Button } from "@/components/ui/Button"
import { Perforation, StubDate } from "@/components/ui/Perforation"
import { useCatalogEvents } from "@/hooks/useCatalogEvents"
import { companiesAPI } from "@/services/api"

type Company = {
  _id?: string
  id?: string
  name: string
  description?: string
  about?: string
  logo?: string
  contact?: { website?: string }
  address?: { city?: string; country?: string }
  createdAt?: string
}

const hostOf = (url = "") => {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function Organizer() {
  const { id = "" } = useParams<{ id: string }>()
  const [company, setCompany] = useState<Company | null>(null)
  const [companyError, setCompanyError] = useState("")
  const [companyLoading, setCompanyLoading] = useState(true)
  // The shared catalog is usually warm from Home/Events; filtering by the company id keeps this page instant.
  const { events, loading: eventsLoading } = useCatalogEvents()

  useEffect(() => {
    const controller = new AbortController()
    setCompanyLoading(true)
    setCompanyError("")
    companiesAPI
      .getById(id, { signal: controller.signal })
      .then((response: any) => setCompany(response.data.data?.company || response.data.data))
      .catch((err: any) => {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return
        setCompanyError(err.response?.status === 404 ? "not-found" : "We couldn't load this organizer right now.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setCompanyLoading(false)
      })
    return () => controller.abort()
  }, [id])

  const companyId = company?._id || company?.id || id
  const upcoming = useMemo(
    () =>
      events
        .filter((event) => event.organizerId === companyId)
        .filter((event) => +new Date(event.date) >= Date.now())
        .sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [events, companyId],
  )
  const next = upcoming[0]

  if (companyLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-busy="true">
        <div className="h-64 animate-pulse rounded-[var(--radius-card)] border border-border bg-surface" />
      </div>
    )
  }

  if (companyError || !company) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-32 text-center">
        <h1 className="type-print text-4xl">{companyError === "not-found" ? "Organizer not found" : "Something went wrong"}</h1>
        <p className="text-muted">
          {companyError === "not-found" ? "This organizer page doesn't exist or is no longer public." : companyError}
        </p>
        <Button to="/events">Browse events</Button>
      </div>
    )
  }

  const about = company.description || company.about
  const place = [company.address?.city, company.address?.country].filter(Boolean).join(", ")
  const website = company.contact?.website

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All events
      </Link>

      <header className="mt-6 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface md:flex-row">
        <div className="flex-1 p-6 md:p-8">
          <div className="flex items-start gap-4">
            {company.logo && (
              <img src={company.logo} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-md border border-border object-cover" />
            )}
            <div className="min-w-0">
              <h1 className="type-print text-5xl sm:text-6xl">{company.name}</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                {place && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-2" aria-hidden="true" /> {place}
                  </span>
                )}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"
                  >
                    <Globe className="h-4 w-4 text-muted-2" aria-hidden="true" /> {hostOf(website)}
                  </a>
                )}
              </div>
            </div>
          </div>
          {about && <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted">{about}</p>}
        </div>

        <Perforation className="md:hidden" />
        <Perforation orientation="vertical" className="hidden md:block" />

        <div className="paper flex flex-col justify-between gap-5 p-6 md:w-72 md:p-8">
          <div>
            <p className="text-xs font-medium text-paper-muted">Upcoming events</p>
            <p className="font-display text-5xl font-extrabold leading-none tabular-nums">
              {eventsLoading ? "–" : upcoming.length}
            </p>
          </div>
          {next && (
            <div className="border-t border-paper-line pt-4">
              <p className="mb-2 text-xs font-medium text-paper-muted">Next show</p>
              <StubDate date={next.date} />
              <Link to={`/events/${next.slug}`} className="mt-2 block truncate text-sm font-semibold underline-offset-4 hover:text-foil hover:underline">
                {next.title}
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="mt-14">
        <h2 className="type-print text-4xl">On sale from {company.name}</h2>
        {eventsLoading ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-[24rem] animate-pulse rounded-[var(--radius-card)] border border-border bg-surface" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <p className="mt-6 rounded-[var(--radius-card)] border border-dashed border-border-strong px-6 py-12 text-center text-muted">
            No upcoming events from this organizer yet. Check back soon.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
