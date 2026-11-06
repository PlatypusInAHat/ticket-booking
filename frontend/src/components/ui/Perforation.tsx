import { cn } from "@/lib/utils"

/**
 * The tear line between a ticket's body and its stub: a dashed rule with a die-cut notch at each end.
 * The notches are discs in the colour of the ground the ticket sits on, clipped by the ticket's
 * overflow-hidden edge, so `groundClassName` must match that ground.
 */
export function Perforation({
  orientation = "horizontal",
  groundClassName = "bg-background",
  endGroundClassName,
  className,
}: {
  orientation?: "horizontal" | "vertical"
  groundClassName?: string
  /** Ground behind the second notch, when the ticket straddles two grounds. */
  endGroundClassName?: string
  className?: string
}) {
  const horizontal = orientation === "horizontal"

  return (
    <div
      aria-hidden="true"
      className={cn("relative shrink-0", horizontal ? "h-0 w-full" : "w-0 self-stretch", className)}
    >
      <span
        className={cn(
          "absolute border-dashed border-paper-line",
          horizontal ? "inset-x-5 -top-px border-t-2" : "inset-y-5 -left-px border-l-2",
        )}
      />
      <span
        className={cn(
          "absolute -left-3.5 -top-3.5 h-7 w-7 rounded-full border border-border",
          groundClassName,
        )}
      />
      <span
        className={cn(
          "absolute h-7 w-7 rounded-full border border-border",
          endGroundClassName ?? groundClassName,
          horizontal ? "-right-3.5 -top-3.5" : "-bottom-3.5 -left-3.5",
        )}
      />
    </div>
  )
}

/** Day / month / weekday block printed on a stub, the way a ticket prints its date. */
export function StubDate({ date, className }: { date: string | Date; className?: string }) {
  const value = new Date(date)
  const valid = !Number.isNaN(+value)
  const day = valid ? String(value.getDate()).padStart(2, "0") : "--"
  const month = valid ? value.toLocaleDateString("en-GB", { month: "short" }) : "TBA"
  const weekday = valid ? value.toLocaleDateString("en-GB", { weekday: "short" }) : ""
  const time = valid ? value.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""

  return (
    <time dateTime={valid ? value.toISOString() : undefined} className={cn("flex items-end gap-2", className)}>
      <span className="type-print text-5xl leading-[0.8]">{day}</span>
      <span className="flex flex-col pb-0.5 font-display text-sm font-bold uppercase leading-[1.05] tracking-[0.03em]">
        <span>{month}</span>
        <span className="opacity-70">
          {weekday} {time}
        </span>
      </span>
    </time>
  )
}
