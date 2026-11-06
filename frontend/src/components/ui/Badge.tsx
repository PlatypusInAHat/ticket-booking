import { cn } from "@/lib/utils"
import type { EventStatus } from "@/data/types"

type Tone = "accent" | "success" | "danger" | "neutral" | "info"

// Statuses are printed like a rubber stamp on the ticket: a ruled box of condensed caps, no fill.
const tones: Record<Tone, string> = {
  accent: "text-accent border-accent/70",
  success: "text-foreground border-foreground/60",
  danger: "text-danger border-danger/70",
  info: "text-info border-info/70",
  neutral: "text-muted border-border-strong",
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 pb-px pt-0.5 font-display text-[0.8125rem] font-bold uppercase leading-none tracking-[0.04em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  if (status === "soldout")
    return (
      <Badge tone="danger" className={className}>
        Sold out
      </Badge>
    )
  if (status === "limited")
    return (
      <Badge tone="accent" className={className}>
        Almost gone
      </Badge>
    )
  return (
    <Badge tone="success" className={className}>
      On sale
    </Badge>
  )
}
