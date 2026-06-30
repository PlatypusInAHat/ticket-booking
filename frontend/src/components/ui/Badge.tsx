import { cn } from "@/lib/utils"
import type { EventStatus } from "@/data/types"

type Tone = "accent" | "success" | "danger" | "neutral" | "info"

const tones: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent border-accent/30",
  success: "bg-success/12 text-success border-success/30",
  danger: "bg-danger/12 text-danger border-danger/30",
  info: "bg-info/12 text-info border-info/30",
  neutral: "bg-surface-2 text-muted border-border",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide backdrop-blur-sm",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "soldout") return <Badge tone="danger">Hết vé</Badge>
  if (status === "limited")
    return (
      <Badge tone="accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        Sắp hết
      </Badge>
    )
  return (
    <Badge tone="success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Đang bán
    </Badge>
  )
}
