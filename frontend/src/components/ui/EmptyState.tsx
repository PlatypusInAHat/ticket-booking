import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/Button"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionTo,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: string
  actionTo?: string
}) {
  const titleId = `empty-state-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  const descriptionId = `${titleId}-description`

  return (
    <section aria-labelledby={titleId} aria-describedby={descriptionId} className="flex flex-col items-center gap-5 rounded-[var(--radius-card)] border border-border bg-surface px-6 py-16 text-center sm:px-8 sm:py-20">
      <span className="flex h-16 w-16 items-center justify-center rounded-md bg-surface-2 text-muted-2">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <div>
        <h1 id={titleId} className="type-print text-4xl">{title}</h1>
        <p id={descriptionId} className="mx-auto mt-2 max-w-md leading-relaxed text-muted">{description}</p>
      </div>
      {action && actionTo && <Button to={actionTo} size="lg">{action}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>}
    </section>
  )
}
