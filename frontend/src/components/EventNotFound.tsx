import { ArrowLeft, CalendarX, Compass, Ticket } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Perforation } from "@/components/ui/Perforation"

export function EventNotFound({ message }: { message?: string }) {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-6xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            <CalendarX className="h-4 w-4" aria-hidden="true" /> Event unavailable
          </p>
          <h1 className="mt-5 max-w-xl type-print text-6xl leading-[0.86] sm:text-8xl">
            This event missed the stage.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted">
            {message || "This event may have ended, sold out, or moved to a different ticket link."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/events">
              <Compass className="h-4 w-4" aria-hidden="true" /> Browse events
            </Button>
            <Button to="/" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back home
            </Button>
          </div>
        </div>

        <div className="relative rotate-[2deg] overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
          <div className="paper p-7 text-paper-ink sm:p-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-paper-muted">TicketStage / Event desk</p>
                <p className="mt-5 font-display text-7xl font-extrabold leading-none text-foil sm:text-9xl">N/A</p>
              </div>
              <Ticket className="h-10 w-10 text-foil" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="mt-10 border-t-2 border-dashed border-paper-line pt-5">
              <p className="font-display text-2xl font-extrabold uppercase tracking-wide">No admission</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-paper-muted">
                This event is not attached to an active ticket listing.
              </p>
            </div>
          </div>
          <Perforation />
          <div className="flex items-center justify-between gap-4 bg-surface px-7 py-5 text-xs text-muted sm:px-10">
            <span>CHECK THE LINEUP</span>
            <span className="font-mono text-[10px] tracking-[0.25em]">TS-EVENT-N/A</span>
          </div>
        </div>
      </div>
    </section>
  )
}
