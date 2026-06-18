import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { CheckCircle, Clock, AlertTriangle, Receipt, Ticket } from "lucide-react"
import { paymentAPI } from "@/services/api"
import { cn } from "@/lib/utils"

const statusConfig = {
  completed: {
    icon: CheckCircle,
    title: "Payment Successful",
    description: "Your booking is confirmed. You can view your e-tickets in your dashboard.",
    color: "text-green-500",
    border: "border-green-500/30",
    bg: "bg-green-500/10",
  },
  pending: {
    icon: Clock,
    title: "Pending Confirmation",
    description: "The payment gateway is processing your transaction. Please check back later.",
    color: "text-accent",
    border: "border-accent/30",
    bg: "bg-accent/10",
  },
  failed: {
    icon: AlertTriangle,
    title: "Payment Incomplete",
    description: "The transaction was not successful or the reservation has expired.",
    color: "text-red-500",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
  },
}

export function PaymentResult() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<"completed" | "pending" | "failed">("pending")
  const [message, setMessage] = useState("Checking payment status...")
  
  const bookingId =
    searchParams.get("bookingId") ||
    searchParams.get("orderId") ||
    window.localStorage.getItem("lastPendingBookingId")

  useEffect(() => {
    let isMounted = true

    const fetchStatus = async () => {
      if (!bookingId) {
        setStatus("failed")
        setMessage("Could not find the booking reference to check.")
        return
      }

      try {
        const response = await paymentAPI.getPaymentStatus(bookingId)
        const paymentStatus = response.data.data?.paymentStatus || "pending"

        if (!isMounted) {
          return
        }

        setStatus(
          paymentStatus === "completed" ? "completed" : paymentStatus === "failed" ? "failed" : "pending"
        )
        setMessage(`Booking Ref: ${bookingId}`)

        if (paymentStatus === "completed") {
          window.localStorage.removeItem("lastPendingBookingId")
        }
      } catch (error) {
        if (isMounted) {
          setStatus("pending")
          setMessage(
            "Could not confirm immediately. If you have paid, the system will update after the webhook arrives."
          )
        }
      }
    }

    fetchStatus()

    return () => {
      isMounted = false
    }
  }, [bookingId])

  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center px-4 py-24">
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[150px] pointer-events-none" />

      <div className={cn("glass relative z-10 w-full max-w-2xl rounded-3xl border p-8 text-center md:p-12", config.border)}>
        <div className={cn("mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl", config.bg, config.color)}>
          <Icon className="h-10 w-10" />
        </div>
        <h1 className="font-display text-3xl font-black text-foreground">{config.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted">{config.description}</p>
        <p className="mx-auto mt-5 max-w-md rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-foreground">
          {message}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
          >
            <Receipt className="h-5 w-5" /> View Booking
          </Link>
          <Link
            to="/events"
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-foreground transition-colors hover:bg-surface-2"
          >
            <Ticket className="h-5 w-5" /> Browse Events
          </Link>
        </div>
      </div>
    </div>
  )
}
