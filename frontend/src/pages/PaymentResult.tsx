import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { CheckCircle2, Clock, AlertTriangle, Ticket } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { bookingsAPI, paymentAPI } from "@/services/api"
import { cn } from "@/lib/utils"

type ResultStatus = "checking" | "completed" | "pending" | "failed"

const statusConfig = {
  checking: {
    icon: Clock,
    title: "Checking your payment",
    description: "This usually takes a few seconds.",
    tone: "text-accent bg-accent-soft",
  },
  completed: {
    icon: CheckCircle2,
    title: "You're going!",
    description: "Payment received and your booking is confirmed. Your e-tickets are ready in your account.",
    tone: "text-success bg-success/12",
  },
  pending: {
    icon: Clock,
    title: "Payment is still processing",
    description: "The payment gateway hasn't confirmed yet. Your booking updates automatically once it does.",
    tone: "text-accent bg-accent-soft",
  },
  failed: {
    icon: AlertTriangle,
    title: "Payment wasn't completed",
    description: "The transaction didn't go through or the ticket hold expired. You can book again from the event page.",
    tone: "text-danger bg-danger/12",
  },
} as const

export function PaymentResult() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<ResultStatus>("checking")
  const [note, setNote] = useState("")
  const [bookingNumber, setBookingNumber] = useState("")

  const bookingId =
    searchParams.get("bookingId") ||
    searchParams.get("orderId") ||
    window.localStorage.getItem("lastPendingBookingId")

  useEffect(() => {
    let isMounted = true

    const fetchStatus = async () => {
      if (!bookingId) {
        setStatus("failed")
        setNote("We couldn't find a booking reference to check.")
        return
      }

      try {
        const response = await paymentAPI.getPaymentStatus(bookingId)
        const paymentStatus = response.data.data?.paymentStatus || "pending"

        if (!isMounted) return

        setStatus(paymentStatus === "completed" ? "completed" : paymentStatus === "failed" ? "failed" : "pending")
        setNote("")

        if (paymentStatus === "completed") {
          window.localStorage.removeItem("lastPendingBookingId")
        }
      } catch (error) {
        if (isMounted) {
          setStatus("pending")
          setNote("We couldn't confirm the status just now. If you've paid, it will update once the gateway notifies us.")
        }
      }
    }

    fetchStatus()

    // The booking number matches what the account page shows; fall back to the raw id if the lookup fails.
    if (bookingId) {
      bookingsAPI
        .getById(bookingId)
        .then((response: any) => {
          if (isMounted) setBookingNumber(response.data.data?.bookingNumber || "")
        })
        .catch(() => {})
    }

    return () => {
      isMounted = false
    }
  }, [bookingId])

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center md:p-10">
        <div className={cn("mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-md", config.tone)}>
          <Icon className={cn("h-8 w-8", status === "checking" && "animate-pulse")} aria-hidden="true" />
        </div>
        <h1 className="type-print text-5xl" aria-live="polite">
          {config.title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-muted">{config.description}</p>

        {bookingId && status !== "checking" && (
          <p className="mt-6 text-sm text-muted-2">
            Booking reference <span className="font-mono text-foreground">{bookingNumber || bookingId}</span>
          </p>
        )}
        {note && <p className="mx-auto mt-3 max-w-md text-sm text-muted">{note}</p>}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button to="/dashboard" size="lg">
            <Ticket className="h-4 w-4" aria-hidden="true" />
            {status === "completed" ? "View my tickets" : "View my bookings"}
          </Button>
          <Button to="/events" size="lg" variant="outline">
            Browse events
          </Button>
        </div>
      </div>
    </div>
  )
}
