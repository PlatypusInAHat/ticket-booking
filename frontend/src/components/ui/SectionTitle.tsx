import { cn } from "@/lib/utils"

export function SectionTitle({
  title,
  description,
  align = "left",
  as: Heading = "h2",
  className,
}: {
  title: string
  description?: string
  align?: "left" | "center"
  as?: "h1" | "h2"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <Heading className="type-print text-4xl sm:text-5xl">{title}</Heading>
      {description && (
        <p className="max-w-xl text-pretty leading-relaxed text-muted">{description}</p>
      )}
    </div>
  )
}
