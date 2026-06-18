import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, CheckCircle2, CreditCard, Lock, Receipt } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/store"
import { clearCart } from "@/store/cartSlice"
import { bookingsAPI, paymentAPI } from "@/services/api"
import { formatCurrency } from "@/utils/format"
import { paymentMethodLabels } from "@/utils/labels"

const gatewayMethods = new Set(["vnpay", "momo"])

const getPaymentActionText = (paymentMethod: string) => {
  if (paymentMethod === "vnpay") {
    return "Pay with VNPay"
  }
  if (paymentMethod === "momo") {
    return "Pay with MoMo"
  }
  return "Confirm Demo Payment"
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
      ticketId: item._id || item.id, // Support both new and old structures
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
      throw new Error("Payment gateway did not return a valid redirect URL.")
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
    navigate("/dashboard")
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setStatusText("Reserving your tickets...")

    try {
      const bookingResponse = await bookingsAPI.create(createBookingPayload())
      const booking = bookingResponse.data.data

      window.localStorage.setItem("lastPendingBookingId", booking._id)

      if (gatewayMethods.has(paymentMethod)) {
        setStatusText("Creating secure payment session...")
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

      setStatusText("Completing demo payment...")
      await completeMockPayment(booking)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Payment failed. Please try again.")
    } finally {
      setLoading(false)
      setStatusText("")
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-7xl items-center justify-center px-4 py-24">
        <div className="glass rounded-3xl border border-border p-10 text-center">
          <Receipt className="mx-auto mb-5 h-12 w-12 text-muted" />
          <p className="font-bold text-foreground">Your cart is empty.</p>
          <button
            onClick={() => navigate("/events")}
            className="mt-6 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
          >
            Browse Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-accent/10 blur-[130px] pointer-events-none" />
      <div className="absolute right-0 top-60 h-96 w-96 rounded-full bg-blue-500/10 blur-[130px] pointer-events-none" />

      <button
        type="button"
        onClick={() => navigate("/cart")}
        className="mb-8 flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Cart
      </button>

      <div className="mb-8 relative z-10">
        <span className="mb-3 inline-block rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          Final Step
        </span>
        <h1 className="font-display text-4xl font-black text-foreground">Checkout</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Your tickets will be held for a short time. Choose VNPay or MoMo to redirect to the secure payment gateway.
        </p>
      </div>

      <div className="grid gap-8 relative z-10 lg:grid-cols-[1fr_400px]">
        <form onSubmit={handleSubmit} className="glass rounded-3xl border border-border p-6 md:p-8">
          <div className="mb-8 flex items-center gap-4 border-b border-border pb-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Lock className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-foreground">Delivery Information</h2>
              <p className="text-sm text-muted">
                Your email and phone are used to confirm orders and send e-tickets.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-500">
              {error}
            </div>
          )}

          {statusText && (
            <div className="mb-6 rounded-xl border border-accent/30 bg-accent/10 px-5 py-4 text-sm font-semibold text-accent">
              {statusText}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {["vnpay", "momo", "credit_card", "bank_transfer"].map((value) => (
                  <option key={value} value={value}>
                    {paymentMethodLabels[value as keyof typeof paymentMethodLabels]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
            <p className="font-bold text-foreground">Payment Notice</p>
            <p className="mt-2">
              VNPay/MoMo require real merchant config in `.env`. If unconfigured, use Credit Card or Bank Transfer to run the demo flow.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-accent-foreground transition-colors hover:bg-accent-strong disabled:opacity-50 md:w-auto"
          >
            <CreditCard className="h-5 w-5" />
            {loading ? "Processing..." : getPaymentActionText(paymentMethod)}
          </button>
        </form>

        <aside className="glass rounded-3xl border border-border p-6 lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-xl font-black text-foreground">Order Summary</h2>
          <div className="mt-6 space-y-4">
            {items.map((item: any) => (
              <div key={item._id || item.id} className="rounded-2xl border border-border bg-surface-2 p-4">
                <p className="font-bold text-foreground">{item.eventName || item.title}</p>
                <div className="mt-3 flex justify-between text-sm text-muted">
                  <span>{item.quantity} tickets</span>
                  <span className="font-bold text-green-500">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <div className="flex justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <div className="mt-4 flex justify-between text-xl font-black text-foreground">
              <span>Total</span>
              <span className="text-green-500">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-500">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Tickets are only confirmed after the booking status changes to paid.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
