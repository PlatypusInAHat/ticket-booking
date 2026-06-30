import { useCallback, useEffect, useMemo, useState } from "react"
import { Banknote, Edit, Plus, Save, Trash2, TrendingUp, Ticket, Users } from "lucide-react"
import { adminAPI, eventsAPI } from "@/services/api"
import { formatCurrency, formatDate } from "@/utils/format"
import {
  bookingStatusLabels,
  eventTypeLabels,
  getLabel,
  paymentStatusLabels,
} from "@/utils/labels"
import { cn } from "@/lib/utils"

type TicketTypeForm = {
  id: string
  name: string
  price: number
  isFree: boolean
  totalQuantity: number
  minPerOrder: number
  maxPerOrder: number
  saleStart: string
  saleEnd: string
  description: string
  image: string
}

type EventSessionForm = {
  id: string
  startDate: string
  endDate: string
  ticketTypes: TicketTypeForm[]
}

const emptyEventForm = {
  eventName: "",
  eventType: "concert",
  venue: "",
  city: "",
  state: "",
  country: "Vietnam",
  image: "",
  description: "",
  organizerName: "",
  organizerInfo: "",
  organizerLogo: "",
}

const createEmptyTicket = (): TicketTypeForm => ({
  id: `ticket-${Date.now()}`,
  name: "",
  price: 0,
  isFree: false,
  totalQuantity: 100,
  minPerOrder: 1,
  maxPerOrder: 10,
  saleStart: "",
  saleEnd: "",
  description: "",
  image: "",
})

const createEmptySession = (): EventSessionForm => ({
  id: `session-${Date.now()}`,
  startDate: "",
  endDate: "",
  ticketTypes: [createEmptyTicket()],
})

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [eventForm, setEventForm] = useState(emptyEventForm)
  const [sessions, setSessions] = useState<EventSessionForm[]>([createEmptySession()])

  const fetchStats = useCallback(async () => {
    try {
      const response = await adminAPI.getStats()
      setStats(response.data.data)
    } catch {
      setMessage("Failed to load admin statistics.")
    }
  }, [])

  const fetchBookings = useCallback(async () => {
    try {
      const response = await adminAPI.getBookings()
      setBookings(response.data.data)
    } catch {
      setMessage("Failed to load bookings.")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const response = await eventsAPI.getEvents({ limit: 100 })
      setEvents(response.data.data?.events || [])
    } catch {
      setMessage("Failed to load events.")
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await adminAPI.getUsers()
      setUsers(response.data.data || [])
    } catch {
      setMessage("Failed to load users.")
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchBookings()
    fetchEvents()
    fetchUsers()
  }, [fetchBookings, fetchEvents, fetchStats, fetchUsers])

  const statCards = useMemo(
    () =>
      stats
        ? [
            { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Active Tickets", value: stats.totalTickets, icon: Ticket, color: "text-purple-500", bg: "bg-purple-500/10" },
            { label: "Total Bookings", value: stats.totalBookings, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
            { label: "Revenue", value: formatCurrency(stats.totalRevenue), icon: Banknote, color: "text-green-500", bg: "bg-green-500/10" },
          ]
        : [],
    [stats],
  )

  const updateSession = (sessionId: string, changes: Partial<EventSessionForm>) => {
    setSessions((current) =>
      current.map((session) => (session.id === sessionId ? { ...session, ...changes } : session)),
    )
  }

  const updateTicket = (sessionId: string, ticketId: string, changes: Partial<TicketTypeForm>) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              ticketTypes: session.ticketTypes.map((ticket) =>
                ticket.id === ticketId ? { ...ticket, ...changes } : ticket,
              ),
            }
          : session,
      ),
    )
  }

  const addSession = () => {
    setSessions((current) => [...current, createEmptySession()])
  }

  const removeSession = (sessionId: string) => {
    setSessions((current) => current.filter((session) => session.id !== sessionId))
  }

  const addTicketType = (sessionId: string) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, ticketTypes: [...session.ticketTypes, createEmptyTicket()] }
          : session,
      ),
    )
  }

  const removeTicketType = (sessionId: string, ticketId: string) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, ticketTypes: session.ticketTypes.filter((ticket) => ticket.id !== ticketId) }
          : session,
      ),
    )
  }

  const handlePaymentStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      await adminAPI.updatePaymentStatus(bookingId, newStatus)
      setMessage("Payment status updated successfully.")
      fetchBookings()
      fetchStats()
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to update payment status.")
    }
  }

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminAPI.updateUserRole(userId, newRole)
      setMessage("User role updated successfully.")
      fetchUsers()
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to update user role.")
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return

    try {
      await eventsAPI.delete(eventId)
      setMessage("Event deleted successfully.")
      fetchEvents()
      fetchStats()
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to delete event.")
    }
  }

  const handleCreateEvent = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage("")

    const sessionsData = sessions
      .filter((session) => session.startDate)
      .map((session) => ({
        startDate: session.startDate,
        endDate: session.endDate,
        ticketTypes: session.ticketTypes.filter((ticket) => ticket.name && ticket.totalQuantity > 0),
      }))

    if (sessionsData.length === 0 || sessionsData.some((session) => session.ticketTypes.length === 0)) {
      setMessage("Please create at least one session and one ticket type for each session.")
      return
    }

    try {
      await eventsAPI.createBundle({
        eventData: {
          title: eventForm.eventName,
          eventType: eventForm.eventType,
          location: {
            venue: eventForm.venue,
            city: eventForm.city,
            state: eventForm.state,
            country: eventForm.country,
          },
          organizerDetails: {
            name: eventForm.organizerName,
            info: eventForm.organizerInfo,
            logo: eventForm.organizerLogo,
          },
          description: eventForm.description,
          coverImage: eventForm.image,
        },
        sessionsData,
      })

      setMessage("Event and ticket types were created successfully.")
      setEventForm(emptyEventForm)
      setSessions([createEmptySession()])
      fetchEvents()
      fetchStats()
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to save event bundle.")
    }
  }

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />

      <div className="mb-10">
        <span className="mb-3 inline-block rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
          Admin Control
        </span>
        <h1 className="font-display text-4xl font-black text-foreground">Platform Management</h1>
        <p className="mt-2 text-muted">Oversee tickets, monitor bookings, and manage the platform.</p>
      </div>

      {message && (
        <div className="relative z-10 mb-8 rounded-xl border border-accent/30 bg-accent/10 px-5 py-4 text-sm font-semibold text-accent backdrop-blur-md">
          {message}
        </div>
      )}

      {stats && (
        <section className="relative z-10 mb-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="group flex items-center gap-5 overflow-hidden rounded-2xl border border-border glass p-6">
              <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110", bg, color)}>
                <Icon className="h-6 w-6 drop-shadow-md" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-muted">{label}</p>
                <p className={cn("mt-1 text-2xl font-black", color)}>{value}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="glass relative z-10 mb-12 rounded-2xl border border-border p-8">
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Create event</p>
            <h2 className="mt-2 font-display text-2xl font-black text-foreground">Event bundle</h2>
          </div>
          <button
            type="button"
            onClick={addSession}
            className="flex items-center gap-2 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            <Plus className="h-4 w-4" /> Add session
          </button>
        </div>

        <form onSubmit={handleCreateEvent} className="space-y-8">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Event name</span>
              <input
                value={eventForm.eventName}
                onChange={(e) => setEventForm((current) => ({ ...current, eventName: e.target.value }))}
                className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Event type</span>
              <select
                value={eventForm.eventType}
                onChange={(e) => setEventForm((current) => ({ ...current, eventType: e.target.value }))}
                className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent"
              >
                {Object.entries(eventTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Venue</span>
              <input
                value={eventForm.venue}
                onChange={(e) => setEventForm((current) => ({ ...current, venue: e.target.value }))}
                className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">City</span>
              <input
                value={eventForm.city}
                onChange={(e) => setEventForm((current) => ({ ...current, city: e.target.value }))}
                className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Organizer name</span>
              <input
                value={eventForm.organizerName}
                onChange={(e) => setEventForm((current) => ({ ...current, organizerName: e.target.value }))}
                className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Banner image URL</span>
              <input
                type="url"
                value={eventForm.image}
                onChange={(e) => setEventForm((current) => ({ ...current, image: e.target.value }))}
                className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent"
                placeholder="https://..."
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-foreground">Description</span>
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm((current) => ({ ...current, description: e.target.value }))}
                className="min-h-28 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
                placeholder="Describe the event..."
              />
            </label>
          </div>

          <div className="space-y-5">
            {sessions.map((session, index) => (
              <div key={session.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-foreground">Session {index + 1}</h3>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSession(session.id)}
                      className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-400/10"
                      aria-label="Remove session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-foreground">Start time</span>
                    <input
                      type="datetime-local"
                      value={session.startDate}
                      onChange={(e) => updateSession(session.id, { startDate: e.target.value })}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-accent"
                      required
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-foreground">End time</span>
                    <input
                      type="datetime-local"
                      value={session.endDate}
                      onChange={(e) => updateSession(session.id, { endDate: e.target.value })}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </label>
                </div>

                <div className="mt-5 space-y-4">
                  {session.ticketTypes.map((ticket) => (
                    <div key={ticket.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm font-semibold text-foreground">Ticket name</span>
                          <input
                            value={ticket.name}
                            onChange={(e) => updateTicket(session.id, ticket.id, { name: e.target.value })}
                            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                            required
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-foreground">Price</span>
                          <input
                            type="number"
                            min={0}
                            value={ticket.price}
                            disabled={ticket.isFree}
                            onChange={(e) => updateTicket(session.id, ticket.id, { price: Number(e.target.value) })}
                            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent disabled:opacity-60"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-foreground">Quantity</span>
                          <input
                            type="number"
                            min={1}
                            value={ticket.totalQuantity}
                            onChange={(e) => updateTicket(session.id, ticket.id, { totalQuantity: Number(e.target.value) })}
                            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                          />
                        </label>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm text-muted">
                          <input
                            type="checkbox"
                            checked={ticket.isFree}
                            onChange={(e) => updateTicket(session.id, ticket.id, { isFree: e.target.checked, price: e.target.checked ? 0 : ticket.price })}
                          />
                          Free ticket
                        </label>
                        <button
                          type="button"
                          onClick={() => removeTicketType(session.id, ticket.id)}
                          className="flex items-center gap-2 rounded-lg border border-red-500/50 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" /> Remove ticket
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addTicketType(session.id)}
                    className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
                  >
                    <Plus className="h-4 w-4" /> Add ticket type
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
          >
            <Save className="h-5 w-5" /> Publish event
          </button>
        </form>
      </section>

      <section className="relative z-10 mb-12">
        <div className="glass flex flex-col rounded-2xl border border-border p-8">
          <h2 className="mb-8 font-display text-2xl font-black text-foreground">Active Inventory</h2>
          <div className="custom-scrollbar space-y-4 overflow-y-auto pr-2">
            {events.map((event: any) => (
              <article key={event._id} className="rounded-2xl border border-border bg-surface-2 p-5 transition-colors hover:bg-surface-3">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <span className="mb-3 inline-block rounded-full border border-accent/20 bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                      {getLabel(eventTypeLabels, event.eventType)}
                    </span>
                    <h3 className="text-lg font-black text-foreground">{event.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {event.location?.venue}, {event.location?.city} · {formatDate(event.startsAt)}
                    </p>
                    <p className="mt-3 font-bold text-green-500">
                      Total Capacity: {event.stats?.totalTickets || 0}
                      <span className="ml-2 font-normal text-muted">
                        · {(event.stats?.totalTickets || 0) - (event.stats?.soldTickets || 0)} tickets left
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setMessage("Full event bundle editing will be moved to a dedicated management screen. For now, delete and recreate the event bundle.")}
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-3"
                    >
                      <Edit className="h-4 w-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(event._id)}
                      className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="glass relative z-10 mb-12 rounded-2xl border border-border p-8">
        <h2 className="mb-8 font-display text-2xl font-black text-foreground">Booking Management</h2>
        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface-2" />
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface-2 p-10 text-center">
            <p className="text-muted">No bookings have been made yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Ref ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Tickets</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="transition-colors hover:bg-surface-2">
                    <td className="px-6 py-4 font-mono font-bold text-foreground">{booking.bookingNumber}</td>
                    <td className="px-6 py-4 text-muted">{booking.user?.name || "Unknown"}</td>
                    <td className="px-6 py-4 text-muted">
                      {booking.tickets.reduce((total: number, item: any) => total + item.quantity, 0)}
                    </td>
                    <td className="px-6 py-4 font-black text-green-500">{formatCurrency(booking.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <select
                        value={booking.paymentStatus}
                        onChange={(event) => handlePaymentStatusChange(booking._id, event.target.value)}
                        className="flex min-w-[170px] rounded-lg border border-border bg-surface-3 px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {Object.entries(paymentStatusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label as string}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 font-bold text-accent">
                      <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs uppercase tracking-wider">
                        {getLabel(bookingStatusLabels, booking.bookingStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass relative z-10 mb-12 rounded-2xl border border-border p-8">
        <h2 className="mb-8 font-display text-2xl font-black text-foreground">User Management</h2>
        {users.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface-2 p-10 text-center">
            <p className="text-muted">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {users.map((user) => (
                  <tr key={user._id} className="transition-colors hover:bg-surface-2">
                    <td className="px-6 py-4 font-bold text-foreground">{user.name}</td>
                    <td className="px-6 py-4 text-muted">{user.email}</td>
                    <td className="px-6 py-4 text-muted">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(event) => handleUserRoleChange(user._id, event.target.value)}
                        className="flex min-w-[150px] rounded-lg border border-border bg-surface-3 px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="user">User</option>
                        <option value="staff">Staff</option>
                        <option value="organizer">Organizer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass relative z-10 rounded-2xl border border-border p-8">
        <h2 className="mb-8 font-display text-2xl font-black text-foreground">Event Statistics</h2>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface-2 p-10 text-center">
            <p className="text-muted">No events available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Event Name</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Total Tickets</th>
                  <th className="px-6 py-4 text-right">Sold Tickets</th>
                  <th className="px-6 py-4 text-right">Remaining</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                  <th className="px-6 py-4">Fill Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {events.map((event) => {
                  const total = event.stats?.totalTickets || 0
                  const sold = event.stats?.soldTickets || 0
                  const revenue = event.stats?.revenue || 0
                  const fillRate = total > 0 ? (sold / total) * 100 : 0

                  return (
                    <tr key={`stats-${event._id}`} className="transition-colors hover:bg-surface-2">
                      <td className="px-6 py-4 font-bold text-foreground max-w-[200px] truncate" title={event.title}>
                        {event.title}
                      </td>
                      <td className="px-6 py-4 text-muted">{formatDate(event.startsAt)}</td>
                      <td className="px-6 py-4 text-right font-medium">{total}</td>
                      <td className="px-6 py-4 text-right font-medium text-blue-500">{sold}</td>
                      <td className="px-6 py-4 text-right font-medium text-orange-500">{total - sold}</td>
                      <td className="px-6 py-4 text-right font-black text-green-500">{formatCurrency(revenue)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-3">
                            <div className="h-full bg-accent transition-all duration-500" style={{ width: `${Math.min(fillRate, 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-muted">{fillRate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
