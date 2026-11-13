import { Link } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { Perforation } from "@/components/ui/Perforation"

// A voided ticket: the page the visitor asked for doesn't admit anyone.
export function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col px-4 py-20 sm:py-28">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        <div className="relative px-6 pb-7 pt-8 sm:px-8">
          <p className="type-print text-[clamp(5rem,22vw,9rem)] leading-[0.8] text-muted-2">404</p>
          <h1 className="type-print mt-4 text-4xl sm:text-5xl">This page doesn't admit anyone</h1>
          <p className="mt-3 max-w-md text-pretty text-muted">
            The link may be old, or the event may have been taken down. Your tickets and bookings are not affected.
          </p>
          <span className="absolute right-6 top-8 -rotate-6 rounded-sm border-2 border-danger px-2 pt-1 font-display text-2xl font-extrabold uppercase leading-none text-danger sm:right-8">
            Void
          </span>
        </div>
        <Perforation />
        <div className="paper flex flex-wrap items-center gap-3 px-6 py-5 sm:px-8">
          <Button to="/events">Browse events</Button>
          <Link to="/" className="text-sm font-medium underline underline-offset-4 hover:text-foil">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
