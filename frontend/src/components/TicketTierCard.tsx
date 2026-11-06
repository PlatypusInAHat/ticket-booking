import { Check, Minus, Plus } from "lucide-react"
import type { TicketTier } from "@/data/types"
import { Badge } from "@/components/ui/Badge"
import { Perforation } from "@/components/ui/Perforation"
import { formatCurrency, cn } from "@/lib/utils"

// A ticket tier is a ticket: name and what it includes on the body, price and quantity on the stub.
export function TicketTierCard({
  tier,
  selected,
  quantity,
  onSelect,
  onQuantity,
  soldOut,
}: {
  tier: TicketTier
  selected: boolean
  quantity: number
  onSelect: () => void
  onQuantity: (n: number) => void
  soldOut: boolean
}) {
  const maxQuantity = Math.min(8, tier.remaining)

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={soldOut}
      tabIndex={soldOut ? -1 : 0}
      onClick={() => !soldOut && onSelect()}
      onKeyDown={(e) => {
        if (!soldOut && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface transition-colors duration-150",
        soldOut ? "cursor-not-allowed opacity-55" : "cursor-pointer",
        selected && !soldOut ? "border-accent" : "border-border hover:border-border-strong",
      )}
    >
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                selected ? "border-accent bg-accent" : "border-border-strong",
              )}
              aria-hidden="true"
            >
              {selected && <Check className="h-3 w-3 text-accent-foreground" />}
            </span>
            <h3 className="type-print text-3xl">{tier.name}</h3>
          </div>
          {tier.badge && <Badge tone="accent">{tier.badge}</Badge>}
        </div>

        {tier.description && <p className="text-sm leading-relaxed text-muted">{tier.description}</p>}
        {tier.perks.length > 0 && (
          <p className="text-sm text-muted">
            <span className="text-muted-2">Includes </span>
            {tier.perks.join(" · ")}
          </p>
        )}
      </div>

      <Perforation />

      <div className="paper flex flex-col gap-4 px-5 pb-5 pt-4">
        <div className="flex items-end justify-between gap-3">
          <span className="font-display text-[1.9rem] font-extrabold leading-none tabular-nums text-foil">
            {formatCurrency(tier.price)}
          </span>
          {soldOut ? (
            <span className="rounded-sm border-2 border-current px-1.5 pt-0.5 font-display text-sm font-extrabold uppercase leading-none text-stamp">
              Sold out
            </span>
          ) : (
            <span className="text-xs font-medium tabular-nums text-paper-muted">{tier.remaining} left</span>
          )}
        </div>

        {selected && !soldOut && (
          <div
            className="flex items-center justify-between border-t border-paper-line pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-medium">Quantity</span>
            <div className="flex items-center gap-1 rounded-md border border-paper-line bg-paper-2 p-1">
              <button
                type="button"
                onClick={() => onQuantity(quantity - 1)}
                disabled={quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-paper-ink transition-colors hover:bg-paper disabled:opacity-35"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-7 text-center text-sm font-bold tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantity(quantity + 1)}
                disabled={quantity >= maxQuantity}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-paper-ink transition-colors hover:bg-paper disabled:opacity-35"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
