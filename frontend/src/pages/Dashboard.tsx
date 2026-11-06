import { useCallback, useEffect, useState } from "react"
import { CalendarCheck, ChevronDown, CreditCard, Loader2, QrCode, RefreshCw, Save, Ticket, UserCircle, XCircle } from "lucide-react"
import { bookingsAPI, usersAPI } from "@/services/api"
import { updateProfileSuccess } from "@/store/authSlice"
import { useAppDispatch, useAppSelector } from "@/store"
import { formatCurrency, formatDate } from "@/utils/format"
import {
  bookingStatusLabels,
  getLabel,
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/utils/labels"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Perforation } from "@/components/ui/Perforation"
import { cn } from "@/lib/utils"

const bookingTone = (status: string) =>
  status === "confirmed" ? "success" : status === "cancelled" ? "danger" : "accent"

const passStatusLabels: Record<string, string> = {
  issued: "Valid",
  checked_in: "Checked in",
  cancelled: "Cancelled",
  voided: "Voided",
}

function PassQr({ bookingId, passId }: { bookingId: string; passId: string }) {
  const [src, setSrc] = useState("")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl = ""
    let active = true
    bookingsAPI
      .getPassQr(bookingId, passId)
      .then((response: any) => {
        if (!active) return
        objectUrl = URL.createObjectURL(response.data)
        setSrc(objectUrl)
      })
      .catch(() => active && setFailed(true))
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [bookingId, passId])

  if (failed) {
    return (
      <div className="flex h-36 w-36 items-center justify-center p-2 text-center text-xs text-paper-muted">
        QR unavailable. Show the ticket code at the gate.
      </div>
    )
  }

  return (
    // QR codes need a light quiet zone to scan reliably, so this tile stays white in the dark theme.
    <div className="flex h-36 w-36 items-center justify-center rounded-sm bg-white p-1.5">
      {src ? (
        <img src={src} alt="Ticket QR code" className="h-full w-full" />
      ) : (
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" aria-label="Loading QR code" />
      )}
    </div>
  )
}

function BookingPasses({ bookingId }: { bookingId: string }) {
  const [passes, setPasses] = useState<any[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    bookingsAPI
      .getPasses(bookingId)
      .then((response: any) => setPasses(response.data.data?.passes || []))
      .catch((err: any) => setError(err.response?.data?.message || "We couldn't load these tickets. Please try again."))
  }, [bookingId])

  if (error) return <p className="alert-danger">{error}</p>
  if (!passes) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" /> Loading tickets…
      </p>
    )
  }
  if (passes.length === 0) {
    return <p className="text-sm text-muted">Tickets are issued as soon as payment is confirmed.</p>
  }

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {passes.map((pass) => {
        const status = passStatusLabels[pass.status] || pass.status
        return (
          <li
            key={pass.id}
            className="flex overflow-hidden rounded-[var(--radius-card)] border border-border bg-background"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
              <div>
                <p className="type-print text-2xl">{pass.ticketSnapshot?.ticketName || "Admission ticket"}</p>
                {pass.ticketSnapshot?.eventName && (
                  <p className="mt-1 text-sm text-muted">{pass.ticketSnapshot.eventName}</p>
                )}
              </div>
              <Badge tone={status === "Valid" ? "success" : "neutral"} className="self-start">
                {status}
              </Badge>
              <div className="mt-auto">
                <p className="text-xs text-muted-2">Ticket code</p>
                <p className="break-all font-mono text-xs">{pass.passCode}</p>
              </div>
            </div>
            <Perforation orientation="vertical" groundClassName="bg-surface" />
            <div className="paper flex shrink-0 items-center p-3">
              <PassQr bookingId={bookingId} passId={pass.id} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function Dashboard() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state: any) => state.auth || {})
  const [bookings, setBookings] = useState<any[]>([])
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address?.street || "",
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("bookings")
  const [openBooking, setOpenBooking] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null)
  const [refundBookingId, setRefundBookingId] = useState("")
  const [refundReason, setRefundReason] = useState("")

  const fetchProfile = useCallback(async () => {
    try {
      const response = await usersAPI.getProfile()
      const profileData = response.data.data
      setProfile({
        name: profileData.name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        address: profileData.address?.street || "",
      })
      dispatch(updateProfileSuccess(profileData))
    } catch (error) {
      setMessage({ tone: "danger", text: "We couldn't load your profile. Refresh the page to try again." })
    }
  }, [dispatch])

  const fetchBookings = useCallback(async () => {
    try {
      const response = await bookingsAPI.getAll()
      const payload = response.data.data
      setBookings(Array.isArray(payload) ? payload : payload?.bookings || [])
    } catch (error) {
      setMessage({ tone: "danger", text: "We couldn't load your bookings. Refresh the page to try again." })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchBookings()
  }, [fetchBookings, fetchProfile])

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Cancel this booking? Its tickets will be released and can't be used.")) {
      return
    }

    try {
      await bookingsAPI.cancel(bookingId)
      setMessage({ tone: "success", text: "Booking cancelled." })
      fetchBookings()
    } catch (error: any) {
      setMessage({ tone: "danger", text: error.response?.data?.message || "This booking can't be cancelled." })
    }
  }

  const handleRefundRequest = async (bookingId: string) => {
    if (refundReason.trim().length < 10) {
      setMessage({ tone: "danger", text: "Please explain the refund request in at least 10 characters." })
      return
    }

    try {
      await bookingsAPI.requestRefund(bookingId, refundReason.trim())
      setMessage({ tone: "success", text: "Refund request submitted for review." })
      setRefundBookingId("")
      setRefundReason("")
      fetchBookings()
    } catch (error: any) {
      setMessage({ tone: "danger", text: error.response?.data?.message || "We couldn't submit the refund request." })
    }
  }

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSavingProfile(true)
    setMessage(null)

    try {
      const response = await usersAPI.updateProfile({
        name: profile.name,
        phone: profile.phone,
        address: {
          street: profile.address,
        },
      })
      dispatch(updateProfileSuccess(response.data.data))
      setMessage({ tone: "success", text: "Profile saved." })
    } catch (error: any) {
      setMessage({ tone: "danger", text: error.response?.data?.message || "We couldn't save your profile." })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const tabs = [
    { id: "bookings", label: "My tickets", icon: Ticket },
    { id: "profile", label: "Profile", icon: UserCircle },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="type-print text-5xl sm:text-6xl">My account</h1>
          <p className="mt-2 text-muted">Your bookings, e-tickets and personal details.</p>
        </div>
        {user?.name && (
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-accent font-display text-lg font-bold text-accent-foreground">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          </div>
        )}
      </div>

      <div role="tablist" aria-label="Account sections" className="mt-8 flex gap-6 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors",
                selected ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {tab.label}
            </button>
          )
        })}
      </div>

      {message && (
        <p className={cn("mt-6", message.tone === "success" ? "alert-success" : "alert-danger")} role="status">
          {message.text}
        </p>
      )}

      {activeTab === "bookings" && (
        <section id="panel-bookings" role="tabpanel" aria-labelledby="tab-bookings" className="mt-6">
          {loading ? (
            <div className="flex flex-col gap-4" aria-busy="true">
              {[0, 1].map((index) => (
                <div key={index} className="h-48 animate-pulse rounded-[var(--radius-card)] border border-border bg-surface" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-surface-2 text-muted-2">
                <CalendarCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="type-print text-2xl">No bookings yet</h2>
                <p className="mt-1 text-sm text-muted">Tickets you buy will show up here, ready for the gate.</p>
              </div>
              <Button to="/events" size="sm">
                Find an event
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bookings.map((booking) => {
                const paid = booking.paymentStatus === "completed" && booking.bookingStatus !== "cancelled"
                const isOpen = openBooking === booking._id
                const eventNames = Array.from(
                  new Set(booking.tickets.map((item: any) => item.snapshot?.eventName).filter(Boolean)),
                ) as string[]

                return (
                  <article key={booking._id} className="rounded-[var(--radius-card)] border border-border bg-surface">
                    <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={bookingTone(booking.bookingStatus)}>
                            {getLabel(bookingStatusLabels, booking.bookingStatus)}
                          </Badge>
                          <span className="font-mono text-xs text-muted">{booking.bookingNumber}</span>
                        </div>
                        <h2 className="mt-3 type-print text-3xl text-balance">
                          {eventNames.join(" · ") || "Event booking"}
                        </h2>
                        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                          {booking.tickets.map((item: any, idx: number) => (
                            <li key={`${booking._id}-${idx}`}>
                              {item.quantity} × {item.snapshot?.ticketName || "Ticket"}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="shrink-0 md:text-right">
                        <p className="type-print text-4xl tabular-nums">{formatCurrency(booking.totalAmount)}</p>
                        <p className="mt-1 text-sm text-muted">Booked {formatDate(booking.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-border px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                      <p className="flex items-center gap-2 text-sm text-muted">
                        <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {getLabel(paymentStatusLabels, booking.paymentStatus)} ·{" "}
                        {getLabel(paymentMethodLabels, booking.paymentMethod)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {paid && (
                          <Button
                            size="sm"
                            variant={isOpen ? "secondary" : "primary"}
                            aria-expanded={isOpen}
                            onClick={() => setOpenBooking(isOpen ? "" : booking._id)}
                          >
                            <QrCode className="h-4 w-4" aria-hidden="true" />
                            {isOpen ? "Hide tickets" : "Show tickets"}
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                          </Button>
                        )}
                        {booking.paymentStatus === "pending" && booking.bookingStatus !== "cancelled" && (
                          <Button size="sm" variant="ghost" onClick={() => handleCancelBooking(booking._id)} className="hover:text-danger">
                            <XCircle className="h-4 w-4" aria-hidden="true" /> Cancel booking
                          </Button>
                        )}
                        {booking.paymentStatus === "completed" &&
                          booking.bookingStatus === "confirmed" &&
                          !["requested", "processing", "processed"].includes(booking.refund?.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-expanded={refundBookingId === booking._id}
                              onClick={() => setRefundBookingId(refundBookingId === booking._id ? "" : booking._id)}
                            >
                              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Request refund
                            </Button>
                          )}
                      </div>
                    </div>

                    {booking.refund?.status && booking.refund.status !== "none" && (
                      <p className="border-t border-border px-5 py-3 text-sm text-muted md:px-6">
                        Refund status: <span className="font-semibold uppercase text-foreground">{booking.refund.status}</span>
                      </p>
                    )}

                    {refundBookingId === booking._id && (
                      <div className="border-t border-border p-5 md:p-6">
                        <label htmlFor={`refund-${booking._id}`} className="form-label">
                          Why are you requesting a refund?
                        </label>
                        <textarea
                          id={`refund-${booking._id}`}
                          value={refundReason}
                          onChange={(event) => setRefundReason(event.target.value)}
                          className="form-textarea"
                          rows={3}
                          maxLength={500}
                        />
                        <p className="mt-1 text-xs text-muted-2">At least 10 characters. The organizer reviews every request.</p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={() => handleRefundRequest(booking._id)}>
                            Submit request
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRefundBookingId("")}>
                            Close
                          </Button>
                        </div>
                      </div>
                    )}

                    {isOpen && (
                      <div className="border-t border-border p-5 md:p-6">
                        <BookingPasses bookingId={booking._id} />
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "profile" && (
        <form
          id="panel-profile"
          role="tabpanel"
          aria-labelledby="tab-profile"
          onSubmit={handleProfileSubmit}
          className="mt-6 max-w-3xl rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8"
        >
          <h2 className="type-print text-2xl">Personal information</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="profile-name" className="form-label">
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                className="form-input"
                required
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="form-label">
                Email
              </label>
              <input id="profile-email" type="email" value={profile.email} className="form-input" disabled />
            </div>
            <div>
              <label htmlFor="profile-phone" className="form-label">
                Phone number
              </label>
              <input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                value={profile.phone}
                onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="profile-role" className="form-label">
                Account type
              </label>
              <input
                id="profile-role"
                type="text"
                value={user?.role === "admin" ? "Administrator" : "Customer"}
                className="form-input"
                disabled
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="profile-address" className="form-label">
                Address
              </label>
              <textarea
                id="profile-address"
                autoComplete="street-address"
                value={profile.address}
                onChange={(event) => setProfile((current) => ({ ...current, address: event.target.value }))}
                className="form-textarea"
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" disabled={isSavingProfile} className="mt-8">
            <Save className="h-4 w-4" aria-hidden="true" /> {isSavingProfile ? "Saving…" : "Save changes"}
          </Button>
        </form>
      )}
    </div>
  )
}
