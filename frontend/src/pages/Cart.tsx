import { Minus, Plus, Trash2, ShoppingBag, ShieldCheck, Calendar } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { useAppDispatch, useAppSelector } from "@/store"
import { removeFromCart, updateQuantity } from "@/store/cartSlice"
import { formatCurrency, formatDate } from "@/lib/utils"

export function Cart() {
  const items = useAppSelector((s) => s.cart.items || [])
  const dispatch = useAppDispatch()

  const subtotal = items.reduce((n: number, l: any) => n + l.price * l.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Pick an event you love and your tickets will appear here."
          action="Browse events"
          actionTo="/events"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="type-print text-5xl sm:text-6xl">Your ticket cart</h1>
      <p className="mt-2 text-muted">
        {items.length} ticket type{items.length === 1 ? "" : "s"} ready for checkout.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          {items.map((line: any) => (
            <article
              key={line._id || line.id}
              className="grid grid-cols-[auto_1fr] gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:flex"
            >
              <img
                src={line.image || line.eventImage || "/placeholder.svg"}
                alt={line.eventName || line.eventTitle || "Event"}
                loading="lazy"
                className="h-20 w-20 shrink-0 rounded-md bg-surface-2 object-cover sm:h-24 sm:w-24"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display font-semibold">{line.eventName || line.eventTitle}</h3>
                    <p className="text-sm text-accent">{line.category || line.tierName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch(removeFromCart(line._id || line.id))}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-surface-2 hover:text-danger"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(line.date || line.eventDate)} &middot; {line.location?.venue || line.venue}
                </p>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
                    <button
                      type="button"
                      onClick={() =>
                        dispatch(
                          updateQuantity({
                            id: line._id || line.id,
                            quantity: line.quantity - 1,
                          }),
                        )
                      }
                      disabled={line.quantity <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch(
                          updateQuantity({
                            id: line._id || line.id,
                            quantity: line.quantity + 1,
                          }),
                        )
                      }
                      disabled={line.quantity >= (line.availableSeats || Infinity)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-display font-semibold tabular-nums">
                    {formatCurrency(line.price * line.quantity)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h2 className="type-print text-2xl">Order summary</h2>
            <div className="mt-5 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-display text-xl font-bold tabular-nums text-accent">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>

            <Button to="/checkout" className="mt-6 w-full" size="lg">
              Checkout
            </Button>
            <Button to="/events" variant="ghost" size="sm" className="mt-2 w-full">
              Browse more events
            </Button>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-2">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Secure encrypted checkout
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
