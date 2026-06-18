import { cn } from "@/lib/utils"

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: "left" | "center"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="max-w-xl text-pretty leading-relaxed text-muted">{description}</p>
      )}
    </div>
  )
}
