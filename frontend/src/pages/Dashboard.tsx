import { useCallback, useEffect, useState } from "react"
import { CalendarCheck, XCircle, Save, UserCircle, CreditCard, Ticket } from "lucide-react"
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
import { cn } from "@/lib/utils"

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
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [message, setMessage] = useState("")

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
      setMessage("Failed to load profile.")
    }
  }, [dispatch])

  const fetchBookings = useCallback(async () => {
    try {
      const response = await bookingsAPI.getAll()
      setBookings(response.data.data)
    } catch (error) {
      setMessage("Failed to load booking history.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchBookings()
  }, [fetchBookings, fetchProfile])

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return
    }

    try {
      await bookingsAPI.cancel(bookingId)
      setMessage("Booking has been cancelled.")
      fetchBookings()
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Cannot cancel booking.")
    }
  }

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSavingProfile(true)
    setMessage("")

    try {
      const response = await usersAPI.updateProfile({
        name: profile.name,
        phone: profile.phone,
        address: {
          street: profile.address,
        },
      })
      dispatch(updateProfileSuccess(response.data.data))
      setMessage("Profile updated successfully.")
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Cannot update profile.")
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="mb-3 inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
            Member Area
          </span>
          <h1 className="font-display text-4xl font-black text-foreground">Dashboard</h1>
          <p className="mt-2 text-muted">Manage your bookings, tickets, and personal profile.</p>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border glass px-6 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-blue-500 text-xl font-bold text-accent-foreground shadow-[0_0_15px_rgba(var(--accent),0.3)]">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Welcome Back</p>
            <p className="text-lg font-black text-foreground">{user?.name}</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="relative z-10 mb-8 rounded-xl border border-accent/30 bg-accent/10 px-5 py-4 text-sm font-semibold text-accent shadow-[0_0_15px_rgba(var(--accent),0.15)] backdrop-blur-md">
          {message}
        </div>
      )}

      <div className="relative z-10 mb-8 flex flex-wrap gap-4">
        <button
          onClick={() => setActiveTab("bookings")}
          className={cn(
            "flex items-center gap-3 rounded-xl px-6 py-4 font-bold transition-all duration-300",
            activeTab === "bookings"
              ? "border border-accent/50 bg-accent/10 text-accent shadow-[inset_0_0_20px_rgba(var(--accent),0.15)]"
              : "border border-transparent bg-surface text-muted hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <Ticket className="h-5 w-5" /> My Bookings
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-3 rounded-xl px-6 py-4 font-bold transition-all duration-300",
            activeTab === "profile"
              ? "border border-blue-500/50 bg-blue-500/10 text-blue-500 shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]"
              : "border border-transparent bg-surface text-muted hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <UserCircle className="h-5 w-5" /> Profile Settings
        </button>
      </div>

      {activeTab === "bookings" && (
        <section className="relative z-10">
          {loading ? (
            <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface-2" />
          ) : bookings.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center border border-border">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface-2">
                <CalendarCheck className="h-10 w-10 text-muted" />
              </div>
              <h2 className="text-2xl font-black text-foreground">No Bookings Yet</h2>
              <p className="mt-3 text-muted">Your purchased tickets will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => (
                <article key={booking._id} className="glass overflow-hidden rounded-2xl border border-border group">
                  <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-surface to-surface-2 p-6 md:p-8">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">Booking Ref</p>
                      <p className="font-mono text-lg font-black text-foreground">{booking.bookingNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">Total Amount</p>
                      <p className="text-2xl font-black text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                        {formatCurrency(booking.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="mb-8 grid gap-6 md:grid-cols-2">
                      {booking.tickets.map((item: any, idx: number) => (
                        <div key={`${booking._id}-${idx}`} className="relative overflow-hidden rounded-xl border border-border bg-surface-2 p-5">
                          <div className="absolute left-0 top-0 h-full w-1 bg-accent"></div>
                          <p className="text-lg font-black text-foreground">
                            {item.snapshot?.eventName || item.snapshot?.ticketName || "Event Ticket"}
                          </p>
                          <div className="mt-4 flex items-end justify-between">
                            <p className="text-muted">
                              Qty: <span className="font-bold text-foreground">{item.quantity}</span>
                            </p>
                            <p className="font-bold text-accent">{formatCurrency(item.subtotal)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-5 border-t border-border pt-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              booking.bookingStatus === "confirmed"
                                ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                                : "bg-muted"
                            )}
                          ></div>
                          <span>
                            Status:{" "}
                            <strong className="ml-1 text-xs uppercase tracking-wider text-foreground">
                              {getLabel(bookingStatusLabels, booking.bookingStatus)}
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted" />
                          <span>
                            Payment:{" "}
                            <strong className="text-foreground">
                              {getLabel(paymentStatusLabels, booking.paymentStatus)}
                            </strong>{" "}
                            via {getLabel(paymentMethodLabels, booking.paymentMethod)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="h-4 w-4 text-muted" />
                          <span>
                            Date: <strong className="text-foreground">{formatDate(booking.createdAt)}</strong>
                          </span>
                        </div>
                      </div>

                      {booking.bookingStatus !== "cancelled" && (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 font-semibold text-red-500 transition-colors hover:bg-red-500/20 md:w-auto"
                        >
                          <XCircle className="h-4 w-4" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "profile" && (
        <form onSubmit={handleProfileSubmit} className="glass relative z-10 max-w-3xl rounded-2xl border border-border p-8 md:p-12">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none"></div>

          <h2 className="mb-8 font-display text-2xl font-black text-foreground">Personal Information</h2>
          <div className="relative z-10 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <input
                type="email"
                value={profile.email}
                className="flex h-12 w-full cursor-not-allowed rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted"
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Account Role</label>
              <input
                type="text"
                value={user?.role === "admin" ? "Administrator" : "Customer"}
                className="flex h-12 w-full cursor-not-allowed rounded-xl border border-border bg-surface px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted"
                disabled
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-foreground">Address</label>
              <textarea
                value={profile.address}
                onChange={(event) => setProfile((current) => ({ ...current, address: event.target.value }))}
                className="flex min-h-[80px] w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                rows={3}
                placeholder="Street, City, Country..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="relative z-10 mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-accent-foreground transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            <Save className="h-5 w-5" /> {isSavingProfile ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}
    </div>
  )
}
