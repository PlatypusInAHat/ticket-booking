import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Info, Loader2, Lock, Receipt, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useAppDispatch, useAppSelector } from "@/store"
import { clearCart } from "@/store/cartSlice"
import { bookingsAPI, paymentAPI } from "@/services/api"
import { cn, formatCurrency } from "@/lib/utils"

const gatewayMethods = new Set(["vnpay", "momo"])

const paymentOptions = [
  { value: "vnpay", label: "VNPay", hint: "ATM card, QR or banking app" },
  { value: "momo", label: "MoMo", hint: "MoMo e-wallet" },
  { value: "credit_card", label: "Card", hint: "Demo payment, no charge" },
  { value: "bank_transfer", label: "Bank transfer", hint: "Demo payment, no charge" },
]

const getPaymentActionText = (paymentMethod: string) => {
  if (paymentMethod === "vnpay") return "Continue to VNPay"
  if (paymentMethod === "momo") return "Continue to MoMo"
  return "Confirm demo payment"
}

export function Checkout() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state: any) => state.auth || {})
  const items = useAppSelector((state: any) => state.cart.items || [])
  const totalPrice = useAppSelector((state: any) =>
    (state.cart.items || []).reduce((acc: number, item: any) => acc + item.price * item.quantity, 0)
  )

  const [customerName, setCustomerName] = useState(user?.name || "")
  const [customerEmail, setCustomerEmail] = useState(user?.email || "")
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "")
  const [paymentMethod, setPaymentMethod] = useState("credit_card")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [statusText, setStatusText] = useState("")

  const createBookingPayload = () => ({
    tickets: items.map((item: any) => ({
      ticketId: item._id || item.id,
      quantity: item.quantity,
    })),
    paymentMethod,
    customerName,
    customerEmail,
    customerPhone,
    source: "web",
  })

  const redirectToGateway = (session: any) => {
    const redirectUrl = session.redirectUrl || session.paymentUrl || session.deeplink

    if (!redirectUrl) {
      throw new Error("The payment gateway did not return a checkout link. Please choose another method.")
    }

    window.localStorage.setItem("lastPendingBookingId", session.bookingId || "")
    dispatch(clearCart())
    window.location.assign(redirectUrl)
  }

  const completeMockPayment = async (booking: any) => {
    await paymentAPI.processPayment({
      bookingId: booking._id,
      paymentToken: `demo_payment_${Date.now()}`,
    })

    dispatch(clearCart())
    navigate(`/payment/result?bookingId=${booking._id}`)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setStatusText("Holding your tickets…")

    try {
      const bookingResponse = await bookingsAPI.create(createBookingPayload())
      const booking = bookingResponse.data.data

      window.localStorage.setItem("lastPendingBookingId", booking._id)

      if (gatewayMethods.has(paymentMethod)) {
        setStatusText("Opening a secure payment session…")
        const sessionResponse = await paymentAPI.createSession({
          bookingId: booking._id,
          provider: paymentMethod,
        })

        redirectToGateway({
          ...sessionResponse.data.data,
          bookingId: booking._id,
        })
        return
      }

      setStatusText("Confirming your payment…")
      await completeMockPayment(booking)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Payment didn't go through. Please try again or choose another method.")
    } finally {
      setLoading(false)
      setStatusText("")
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-32 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-md bg-surface-2 text-muted-2">
          <Receipt className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h1 className="type-print text-4xl">Nothing to check out</h1>
          <p className="mt-2 text-muted">Your cart is empty. Add tickets to an event to continue.</p>
        </div>
        <Button to="/events" size="lg">
          Browse events
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to cart
      </Link>

      <h1 className="mt-6 type-print text-5xl sm:text-6xl">Checkout</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Your tickets are held while you pay. They're confirmed as soon as the payment clears.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-8 rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8"
        >
          <fieldset>
            <legend className="type-print text-2xl">Ticket delivery</legend>
            <p className="mt-1 text-sm text-muted">We send the order confirmation and e-tickets to these details.</p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="customer-name" className="form-label">
                  Full name
                </label>
                <input
                  id="customer-name"
                  type="text"
                  autoComplete="name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label htmlFor="customer-email" className="form-label">
                  Email
                </label>
                <input
                  id="customer-email"
                  type="email"
                  autoComplete="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label htmlFor="customer-phone" className="form-label">
                  Phone number
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  autoComplete="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="type-print text-2xl">Payment method</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {paymentOptions.map((option) => {
                const selected = paymentMethod === option.value
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer items-start gap-3 rounded-xl border bg-background p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent/70",
                      selected ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={option.value}
                      checked={selected}
                      onChange={() => setPaymentMethod(option.value)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        selected ? "border-accent bg-accent" : "border-border-strong",
                      )}
                      aria-hidden="true"
                    >
                      {selected && <Check className="h-3 w-3 text-accent-foreground" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="block text-xs text-muted">{option.hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>

            {import.meta.env.DEV && (
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Developer note: VNPay and MoMo need merchant credentials in the backend <code>.env</code>. Use a demo method
                when they are not configured.
              </p>
            )}
          </fieldset>

          <div className="flex flex-col gap-4 border-t border-border pt-6">
            {error && (
              <p className="alert-danger" role="alert">
                {error}
              </p>
            )}
            {statusText && (
              <p className="flex items-center gap-2 text-sm text-muted" role="status">
                <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
                {statusText}
              </p>
            )}
            <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto sm:self-start">
              <Lock className="h-4 w-4" aria-hidden="true" />
              {loading ? "Processing…" : `${getPaymentActionText(paymentMethod)} · ${formatCurrency(totalPrice)}`}
            </Button>
          </div>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h2 className="type-print text-2xl">Order summary</h2>
            <ul className="mt-5 flex flex-col divide-y divide-border">
              {items.map((item: any) => (
                <li key={item._id || item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.eventName || item.title}</p>
                    <p className="text-sm text-muted">
                      {item.tierName || item.category} · {item.quantity} ticket{item.quantity === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-semibold">Total</span>
              <span className="font-display text-xl font-bold tabular-nums text-accent">
                {formatCurrency(totalPrice)}
              </span>
            </div>

            <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              Tickets are issued only after the order status changes to paid.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
