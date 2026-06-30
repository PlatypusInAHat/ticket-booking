import { Link } from "react-router-dom"
import { Minus, Plus, Trash2, ShoppingBag, ShieldCheck, Calendar } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useAppDispatch, useAppSelector } from "@/store"
import { removeFromCart, updateQuantity } from "@/store/cartSlice"
import { formatCurrency, formatDate } from "@/lib/utils"

export function Cart() {
  const items = useAppSelector((s) => s.cart.items || [])
  const dispatch = useAppDispatch()

  const subtotal = items.reduce((n: number, l: any) => n + l.price * l.quantity, 0)
  const fees = Math.round(subtotal * 0.12)
  const total = subtotal + fees

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-32 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-muted-2">
          <ShoppingBag className="h-7 w-7" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Giỏ vé đang trống</h1>
          <p className="mt-2 text-muted">Chọn sự kiện bạn thích và vé sẽ xuất hiện ở đây.</p>
        </div>
        <Button to="/events" size="lg">
          Xem sự kiện
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">Giỏ vé của bạn</h1>
      <p className="mt-2 text-muted">
        {items.length} loại vé đã sẵn sàng thanh toán.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Items */}
        <div className="flex flex-col gap-4">
          {items.map((line: any) => (
            <div
              key={line._id || line.id}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <img
                src={line.image || line.eventImage || "/placeholder.svg"}
                alt={line.eventName || line.eventTitle}
                className="h-24 w-24 shrink-0 rounded-xl object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display font-semibold">{line.eventName || line.eventTitle}</h3>
                    <p className="text-sm text-accent">{line.category || line.tierName}</p>
                  </div>
                  <button
                    onClick={() =>
                      dispatch(removeFromCart(line._id || line.id))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-surface-2 hover:text-danger"
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
                  <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
                    <button
                      onClick={() =>
                        dispatch(
                          updateQuantity({
                            id: line._id || line.id,
                            quantity: line.quantity - 1,
                          }),
                        )
                      }
                      disabled={line.quantity <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{line.quantity}</span>
                    <button
                      onClick={() =>
                        dispatch(
                          updateQuantity({
                            id: line._id || line.id,
                            quantity: line.quantity + 1,
                          }),
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-display font-semibold">
                    {formatCurrency(line.price * line.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-semibold">Tóm tắt đơn hàng</h2>
            <div className="mt-5 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Tạm tính</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                <span className="font-semibold">Tổng cộng</span>
                <span className="font-display text-xl font-bold text-accent">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>

            <Button to="/checkout" className="mt-6 w-full" size="lg">
              Thanh toán
            </Button>
            <Button to="/events" variant="ghost" size="sm" className="mt-2 w-full">
              Xem thêm sự kiện
            </Button>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-2">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Thanh toán bảo mật, mã hoá
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
