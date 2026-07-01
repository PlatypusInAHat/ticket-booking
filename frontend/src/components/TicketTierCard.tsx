import { Check, Minus, Plus } from "lucide-react"
import type { TicketTier } from "@/data/types"
import { Badge } from "@/components/ui/Badge"
import { formatCurrency, cn } from "@/lib/utils"

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
  return (
    <div
      onClick={() => !soldOut && onSelect()}
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl border bg-surface p-5 transition-all duration-200",
        soldOut
          ? "cursor-not-allowed opacity-55"
          : "cursor-pointer hover:border-border-strong",
        selected && !soldOut && "border-accent accent-glow bg-surface-2",
        !selected && !soldOut && "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
              selected ? "border-accent bg-accent" : "border-border-strong",
            )}
          >
            {selected && <Check className="h-3 w-3 text-accent-foreground" />}
          </span>
          <h3 className="font-display font-semibold">{tier.name}</h3>
        </div>
        {tier.badge && <Badge tone="accent">{tier.badge}</Badge>}
      </div>

      <p className="text-sm leading-relaxed text-muted">{tier.description}</p>

      <ul className="flex flex-col gap-2">
        {tier.perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2 text-sm text-muted">
            <Check className="h-4 w-4 shrink-0 text-accent" />
            {perk}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
        <div className="flex flex-col">
          <span className="font-display text-2xl font-bold">{formatCurrency(tier.price)}</span>
          <span className="text-xs text-muted-2">
            {soldOut ? "Sold out" : `${tier.remaining} tickets left`}
          </span>
        </div>

        {selected && !soldOut && (
          <div
            className="flex items-center gap-1 rounded-full border border-border bg-background p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onQuantity(quantity - 1)}
              disabled={quantity <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
            <button
              onClick={() => onQuantity(quantity + 1)}
              disabled={quantity >= Math.min(8, tier.remaining)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
