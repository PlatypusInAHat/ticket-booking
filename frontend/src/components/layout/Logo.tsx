import { cn } from "@/lib/utils"

/** Wordmark: an amber admit-one ticket with die-cut notches, then the name in print caps. */
export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 22" className="h-[1.375rem] w-8 shrink-0" aria-hidden="true">
        <path
          d="M3 0h26a3 3 0 0 1 3 3v5a3 3 0 0 0 0 6v5a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3v-5a3 3 0 0 0 0-6V3a3 3 0 0 1 3-3Z"
          fill="var(--color-accent)"
        />
        <path d="M22 3.5v15" stroke="var(--color-accent-foreground)" strokeWidth="1.6" strokeDasharray="2 2" />
      </svg>
      {showName && <span className="type-print text-[1.6rem] leading-none">TicketStage</span>}
    </span>
  )
}
