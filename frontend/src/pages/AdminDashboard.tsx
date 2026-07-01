import { useCallback, useEffect, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import {
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Image as ImageIcon,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Ticket,
  Trash2,
  TrendingUp,
  UploadCloud,
  Users,
} from "lucide-react"
import { adminAPI, eventsAPI, uploadAPI } from "@/services/api"
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

type EventForm = {
  eventName: string
  eventType: string
  venue: string
  address: string
  city: string
  state: string
  country: string
  latitude: string
  longitude: string
  timezone: string
  image: string
  galleryUrl: string
  description: string
  organizerName: string
  organizerInfo: string
  organizerLogo: string
  tags: string
  eventSaleStart: string
  eventSaleEnd: string
  gatesOpenAt: string
  checkInStartsAt: string
  checkInEndsAt: string
  allowQr: boolean
  allowBarcode: boolean
  allowNfc: boolean
  allowManual: boolean
  refundPolicy: string
  transferAllowed: boolean
  ageRestriction: number
}

const emptyEventForm: EventForm = {
  eventName: "",
  eventType: "concert",
  venue: "",
  address: "",
  city: "",
  state: "",
  country: "Vietnam",
  latitude: "",
  longitude: "",
  timezone: "Asia/Ho_Chi_Minh",
  image: "",
  galleryUrl: "",
  description: "",
  organizerName: "",
  organizerInfo: "",
  organizerLogo: "",
  tags: "",
  eventSaleStart: "",
  eventSaleEnd: "",
  gatesOpenAt: "",
  checkInStartsAt: "",
  checkInEndsAt: "",
  allowQr: true,
  allowBarcode: true,
  allowNfc: true,
  allowManual: true,
  refundPolicy: "",
  transferAllowed: false,
  ageRestriction: 0,
}

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const createEmptyTicket = (): TicketTypeForm => ({
  id: createId("ticket"),
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
  id: createId("session"),
  startDate: "",
  endDate: "",
  ticketTypes: [createEmptyTicket()],
})

const wizardSteps = [
  { id: 1, title: "Basics", description: "Name, type, organizer" },
  { id: 2, title: "Location & Media", description: "Venue, map, images" },
  { id: 3, title: "Schedule & Tickets", description: "Sessions and ticket types" },
  { id: 4, title: "Rules & Review", description: "Admission, policies, publish" },
]

const totalTicketCapacity = (sessions: EventSessionForm[]) =>
  sessions.reduce(
    (sessionTotal, session) =>
      sessionTotal + session.ticketTypes.reduce((ticketTotal, ticket) => ticketTotal + Number(ticket.totalQuantity || 0), 0),
    0,
  )

const totalTicketRevenue = (sessions: EventSessionForm[]) =>
  sessions.reduce(
    (sessionTotal, session) =>
      sessionTotal +
      session.ticketTypes.reduce(
        (ticketTotal, ticket) => ticketTotal + Number(ticket.totalQuantity || 0) * (ticket.isFree ? 0 : Number(ticket.price || 0)),
        0,
      ),
    0,
  )

const toOptionalDate = (value: string) => (value ? new Date(value).toISOString() : undefined)

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [activeStep, setActiveStep] = useState(1)
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm)
  const [sessions, setSessions] = useState<EventSessionForm[]>([createEmptySession()])
  const [isPublishing, setIsPublishing] = useState(false)

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

  const draftCapacity = useMemo(() => totalTicketCapacity(sessions), [sessions])
  const draftRevenue = useMemo(() => totalTicketRevenue(sessions), [sessions])
  const completedStepCount = useMemo(() => {
    let count = 0
    if (eventForm.eventName && eventForm.eventType && eventForm.organizerName) count += 1
    if (eventForm.venue && eventForm.city && eventForm.image) count += 1
    if (sessions.some((session) => session.startDate && session.ticketTypes.some((ticket) => ticket.name && ticket.totalQuantity > 0))) count += 1
    if (eventForm.allowQr || eventForm.allowBarcode || eventForm.allowNfc || eventForm.allowManual) count += 1
    return count
  }, [eventForm, sessions])

  const setEventField = <K extends keyof EventForm>(field: K, value: EventForm[K]) => {
    setEventForm((current) => ({ ...current, [field]: value }))
  }

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

  const duplicateSession = (session: EventSessionForm) => {
    setSessions((current) => [
      ...current,
      {
        ...session,
        id: createId("session"),
        ticketTypes: session.ticketTypes.map((ticket) => ({ ...ticket, id: createId("ticket") })),
      },
    ])
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

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>, onUploaded: (url: string) => void) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const response = await uploadAPI.uploadImage(file)
      onUploaded(response.data.url)
      setMessage("Image uploaded successfully.")
    } catch (error: any) {
      setMessage(error.response?.data?.error || "Image upload failed.")
    } finally {
      event.target.value = ""
    }
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

  const validateDraft = () => {
    if (!eventForm.eventName || !eventForm.eventType || !eventForm.organizerName) {
      setMessage("Please complete event name, type, and organizer name.")
      setActiveStep(1)
      return false
    }

    if (!eventForm.venue || !eventForm.city) {
      setMessage("Please complete venue and city.")
      setActiveStep(2)
      return false
    }

    const validSessions = sessions.filter((session) => session.startDate && session.ticketTypes.some((ticket) => ticket.name && ticket.totalQuantity > 0))
    if (validSessions.length === 0) {
      setMessage("Please create at least one valid session with one ticket type.")
      setActiveStep(3)
      return false
    }

    return true
  }

  const buildPayload = () => {
    const tags = eventForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)

    const gallery = eventForm.galleryUrl
      ? [{ url: eventForm.galleryUrl, caption: `${eventForm.eventName} gallery` }]
      : []

    return {
      eventData: {
        title: eventForm.eventName,
        eventType: eventForm.eventType,
        description: eventForm.description,
        coverImage: eventForm.image,
        gallery,
        timezone: eventForm.timezone,
        tags,
        location: {
          venue: eventForm.venue,
          address: eventForm.address,
          city: eventForm.city,
          state: eventForm.state,
          country: eventForm.country,
          coordinates: {
            lat: eventForm.latitude ? Number(eventForm.latitude) : undefined,
            lng: eventForm.longitude ? Number(eventForm.longitude) : undefined,
          },
        },
        organizerDetails: {
          name: eventForm.organizerName,
          info: eventForm.organizerInfo,
          logo: eventForm.organizerLogo,
        },
        saleWindow: {
          startsAt: toOptionalDate(eventForm.eventSaleStart),
          endsAt: toOptionalDate(eventForm.eventSaleEnd),
        },
        admission: {
          gatesOpenAt: toOptionalDate(eventForm.gatesOpenAt),
          checkInStartsAt: toOptionalDate(eventForm.checkInStartsAt),
          checkInEndsAt: toOptionalDate(eventForm.checkInEndsAt),
          allowedMethods: {
            qr: eventForm.allowQr,
            barcode: eventForm.allowBarcode,
            nfc: eventForm.allowNfc,
            manual: eventForm.allowManual,
          },
        },
        policies: {
          refundPolicy: eventForm.refundPolicy,
          transferAllowed: eventForm.transferAllowed,
          ageRestriction: Number(eventForm.ageRestriction || 0),
        },
        metadata: {
          createdFrom: "admin-event-wizard",
          estimatedCapacity: draftCapacity,
          estimatedRevenue: draftRevenue,
        },
      },
      sessionsData: sessions
        .filter((session) => session.startDate)
        .map((session) => ({
          startDate: session.startDate,
          endDate: session.endDate || session.startDate,
          ticketTypes: session.ticketTypes
            .filter((ticket) => ticket.name && ticket.totalQuantity > 0)
            .map((ticket) => ({
              ...ticket,
              price: ticket.isFree ? 0 : Number(ticket.price || 0),
              totalQuantity: Number(ticket.totalQuantity || 0),
              minPerOrder: Number(ticket.minPerOrder || 1),
              maxPerOrder: Number(ticket.maxPerOrder || 10),
            })),
        })),
    }
  }

  const handleCreateEvent = async (event: FormEvent) => {
    event.preventDefault()
    setMessage("")

    if (!validateDraft()) return

    try {
      setIsPublishing(true)
      await eventsAPI.createBundle(buildPayload())
      setMessage("Event and ticket types were created successfully.")
      setEventForm(emptyEventForm)
      setSessions([createEmptySession()])
      setActiveStep(1)
      fetchEvents()
      fetchStats()
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to save event bundle.")
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute left-0 top-[520px] h-96 w-96 rounded-full bg-accent/10 blur-[150px] pointer-events-none" />

      <div className="mb-10">
        <span className="mb-3 inline-block rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
          Admin Control
        </span>
        <h1 className="font-display text-4xl font-black text-foreground">Platform Management</h1>
        <p className="mt-2 text-muted">Create polished event launches, monitor bookings, and manage the platform.</p>
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

      <section className="relative z-10 mb-12 overflow-hidden rounded-[2rem] border border-border bg-surface/80 shadow-[0_30px_100px_-60px_rgba(0,0,0,0.9)] backdrop-blur">
        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-border bg-surface-2/70 p-6 lg:border-b-0 lg:border-r">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Event Wizard</p>
            <h2 className="mt-3 font-display text-2xl font-black text-foreground">Create a launch-ready event</h2>
            <p className="mt-3 text-sm text-muted">Complete every detail once, then publish the event with sessions and tickets.</p>

            <div className="mt-8 space-y-3">
              {wizardSteps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-all",
                    activeStep === step.id
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-background/60 text-muted hover:border-border-strong hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-black",
                        activeStep === step.id ? "bg-accent text-accent-foreground" : "bg-surface text-muted",
                      )}
                    >
                      {step.id}
                    </span>
                    <div>
                      <p className="font-bold">{step.title}</p>
                      <p className="text-xs text-muted">{step.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Draft health</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(completedStepCount / 4) * 100}%` }} />
              </div>
              <p className="mt-3 text-sm text-muted">{completedStepCount}/4 sections have enough information.</p>
            </div>
          </aside>

          <form onSubmit={handleCreateEvent} className="p-6 md:p-8">
            {activeStep === 1 && (
              <div className="space-y-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Step 1</p>
                  <h3 className="mt-2 font-display text-3xl font-black text-foreground">Event basics</h3>
                  <p className="mt-2 text-sm text-muted">Set the identity, story, organizer, and searchable tags for this event.</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Event name" required>
                    <input
                      value={eventForm.eventName}
                      onChange={(e) => setEventField("eventName", e.target.value)}
                      className="form-input"
                      placeholder="Neon Nights Live 2026"
                      required
                    />
                  </Field>

                  <Field label="Event type" required>
                    <select value={eventForm.eventType} onChange={(e) => setEventField("eventType", e.target.value)} className="form-input">
                      {Object.entries(eventTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Organizer name" required>
                    <input
                      value={eventForm.organizerName}
                      onChange={(e) => setEventField("organizerName", e.target.value)}
                      className="form-input"
                      placeholder="TicketStage Presents"
                      required
                    />
                  </Field>

                  <Field label="Organizer logo URL">
                    <div className="flex gap-3">
                      <input
                        value={eventForm.organizerLogo}
                        onChange={(e) => setEventField("organizerLogo", e.target.value)}
                        className="form-input"
                        placeholder="https://..."
                      />
                      <ImageUploadButton label="Upload" onChange={(e) => uploadImage(e, (url) => setEventField("organizerLogo", url))} />
                    </div>
                  </Field>

                  <Field label="Tags" hint="Comma separated tags for search and discovery" className="md:col-span-2">
                    <input
                      value={eventForm.tags}
                      onChange={(e) => setEventField("tags", e.target.value)}
                      className="form-input"
                      placeholder="music, night show, festival"
                    />
                  </Field>

                  <Field label="Organizer information" className="md:col-span-2">
                    <textarea
                      value={eventForm.organizerInfo}
                      onChange={(e) => setEventField("organizerInfo", e.target.value)}
                      className="form-textarea"
                      placeholder="Introduce the organizer, production team, or venue partner."
                    />
                  </Field>

                  <Field label="Event description" required className="md:col-span-2">
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventField("description", e.target.value)}
                      className="form-textarea min-h-40"
                      placeholder="Describe the experience, lineup, audience expectations, and highlights."
                      required
                    />
                  </Field>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Step 2</p>
                  <h3 className="mt-2 font-display text-3xl font-black text-foreground">Location and media</h3>
                  <p className="mt-2 text-sm text-muted">Add the venue, address, map coordinates, and visual assets.</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Venue" required>
                    <input value={eventForm.venue} onChange={(e) => setEventField("venue", e.target.value)} className="form-input" required />
                  </Field>

                  <Field label="City" required>
                    <input value={eventForm.city} onChange={(e) => setEventField("city", e.target.value)} className="form-input" required />
                  </Field>

                  <Field label="Address" className="md:col-span-2">
                    <input value={eventForm.address} onChange={(e) => setEventField("address", e.target.value)} className="form-input" />
                  </Field>

                  <Field label="State / Province">
                    <input value={eventForm.state} onChange={(e) => setEventField("state", e.target.value)} className="form-input" />
                  </Field>

                  <Field label="Country">
                    <input value={eventForm.country} onChange={(e) => setEventField("country", e.target.value)} className="form-input" />
                  </Field>

                  <Field label="Latitude">
                    <input value={eventForm.latitude} onChange={(e) => setEventField("latitude", e.target.value)} className="form-input" placeholder="21.0285" />
                  </Field>

                  <Field label="Longitude">
                    <input value={eventForm.longitude} onChange={(e) => setEventField("longitude", e.target.value)} className="form-input" placeholder="105.8542" />
                  </Field>

                  <Field label="Timezone">
                    <input value={eventForm.timezone} onChange={(e) => setEventField("timezone", e.target.value)} className="form-input" />
                  </Field>

                  <Field label="Banner image URL" required>
                    <div className="flex gap-3">
                      <input value={eventForm.image} onChange={(e) => setEventField("image", e.target.value)} className="form-input" placeholder="https://..." required />
                      <ImageUploadButton label="Upload" onChange={(e) => uploadImage(e, (url) => setEventField("image", url))} />
                    </div>
                  </Field>

                  <Field label="Gallery image URL" className="md:col-span-2">
                    <div className="flex gap-3">
                      <input value={eventForm.galleryUrl} onChange={(e) => setEventField("galleryUrl", e.target.value)} className="form-input" placeholder="https://..." />
                      <ImageUploadButton label="Upload" onChange={(e) => uploadImage(e, (url) => setEventField("galleryUrl", url))} />
                    </div>
                  </Field>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <ImagePreview title="Event banner" url={eventForm.image} />
                  <ImagePreview title="Organizer logo" url={eventForm.organizerLogo} />
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Step 3</p>
                    <h3 className="mt-2 font-display text-3xl font-black text-foreground">Schedule and ticket types</h3>
                    <p className="mt-2 text-sm text-muted">Create one or more sessions, each with its own ticket inventory.</p>
                  </div>
                  <button type="button" onClick={addSession} className="btn-outline">
                    <Plus className="h-4 w-4" /> Add session
                  </button>
                </div>

                <div className="space-y-6">
                  {sessions.map((session, sessionIndex) => (
                    <div key={session.id} className="rounded-3xl border border-border bg-background/70 p-5">
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-muted">Session {sessionIndex + 1}</p>
                          <h4 className="font-display text-xl font-black text-foreground">
                            {session.startDate ? formatDate(session.startDate) : "New session"}
                          </h4>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => duplicateSession(session)} className="btn-ghost">
                            Duplicate
                          </button>
                          {sessions.length > 1 && (
                            <button type="button" onClick={() => removeSession(session.id)} className="btn-danger">
                              <Trash2 className="h-4 w-4" /> Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Start time" required>
                          <input
                            type="datetime-local"
                            value={session.startDate}
                            onChange={(e) => updateSession(session.id, { startDate: e.target.value })}
                            className="form-input"
                            required
                          />
                        </Field>
                        <Field label="End time">
                          <input
                            type="datetime-local"
                            value={session.endDate}
                            onChange={(e) => updateSession(session.id, { endDate: e.target.value })}
                            className="form-input"
                          />
                        </Field>
                      </div>

                      <div className="mt-6 space-y-4">
                        {session.ticketTypes.map((ticket, ticketIndex) => (
                          <div key={ticket.id} className="rounded-2xl border border-border bg-surface p-4">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted">Ticket type {ticketIndex + 1}</p>
                                <h5 className="font-display text-lg font-bold text-foreground">{ticket.name || "Untitled ticket"}</h5>
                              </div>
                              {session.ticketTypes.length > 1 && (
                                <button type="button" onClick={() => removeTicketType(session.id, ticket.id)} className="btn-danger">
                                  <Trash2 className="h-4 w-4" /> Remove ticket
                                </button>
                              )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-4">
                              <Field label="Ticket name" required className="md:col-span-2">
                                <input value={ticket.name} onChange={(e) => updateTicket(session.id, ticket.id, { name: e.target.value })} className="form-input" required />
                              </Field>
                              <Field label="Quantity" required>
                                <input
                                  type="number"
                                  min={1}
                                  value={ticket.totalQuantity}
                                  onChange={(e) => updateTicket(session.id, ticket.id, { totalQuantity: Number(e.target.value) })}
                                  className="form-input"
                                  required
                                />
                              </Field>
                              <Field label="Price">
                                <input
                                  type="number"
                                  min={0}
                                  value={ticket.price}
                                  disabled={ticket.isFree}
                                  onChange={(e) => updateTicket(session.id, ticket.id, { price: Number(e.target.value) })}
                                  className="form-input disabled:opacity-60"
                                />
                              </Field>
                              <Field label="Min per order">
                                <input
                                  type="number"
                                  min={1}
                                  value={ticket.minPerOrder}
                                  onChange={(e) => updateTicket(session.id, ticket.id, { minPerOrder: Number(e.target.value) })}
                                  className="form-input"
                                />
                              </Field>
                              <Field label="Max per order">
                                <input
                                  type="number"
                                  min={1}
                                  value={ticket.maxPerOrder}
                                  onChange={(e) => updateTicket(session.id, ticket.id, { maxPerOrder: Number(e.target.value) })}
                                  className="form-input"
                                />
                              </Field>
                              <Field label="Sale starts">
                                <input
                                  type="datetime-local"
                                  value={ticket.saleStart}
                                  onChange={(e) => updateTicket(session.id, ticket.id, { saleStart: e.target.value })}
                                  className="form-input"
                                />
                              </Field>
                              <Field label="Sale ends">
                                <input
                                  type="datetime-local"
                                  value={ticket.saleEnd}
                                  onChange={(e) => updateTicket(session.id, ticket.id, { saleEnd: e.target.value })}
                                  className="form-input"
                                />
                              </Field>
                              <Field label="Ticket image URL" className="md:col-span-2">
                                <div className="flex gap-3">
                                  <input value={ticket.image} onChange={(e) => updateTicket(session.id, ticket.id, { image: e.target.value })} className="form-input" />
                                  <ImageUploadButton label="Upload" onChange={(e) => uploadImage(e, (url) => updateTicket(session.id, ticket.id, { image: url }))} />
                                </div>
                              </Field>
                              <Field label="Ticket description" className="md:col-span-2">
                                <textarea
                                  value={ticket.description}
                                  onChange={(e) => updateTicket(session.id, ticket.id, { description: e.target.value })}
                                  className="form-textarea min-h-24"
                                  placeholder="Describe access, seating zone, perks, or restrictions."
                                />
                              </Field>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <label className="flex items-center gap-2 text-sm font-semibold text-muted">
                                <input
                                  type="checkbox"
                                  checked={ticket.isFree}
                                  onChange={(e) => updateTicket(session.id, ticket.id, { isFree: e.target.checked, price: e.target.checked ? 0 : ticket.price })}
                                />
                                Free ticket
                              </label>
                              <p className="text-sm text-muted">
                                Potential revenue: <span className="font-bold text-green-500">{formatCurrency((ticket.isFree ? 0 : ticket.price) * ticket.totalQuantity)}</span>
                              </p>
                            </div>
                          </div>
                        ))}

                        <button type="button" onClick={() => addTicketType(session.id)} className="btn-outline">
                          <Plus className="h-4 w-4" /> Add ticket type
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="space-y-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Step 4</p>
                  <h3 className="mt-2 font-display text-3xl font-black text-foreground">Rules and review</h3>
                  <p className="mt-2 text-sm text-muted">Set sale windows, check-in methods, policies, then review before publishing.</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Event sale starts">
                    <input type="datetime-local" value={eventForm.eventSaleStart} onChange={(e) => setEventField("eventSaleStart", e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Event sale ends">
                    <input type="datetime-local" value={eventForm.eventSaleEnd} onChange={(e) => setEventField("eventSaleEnd", e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Gates open at">
                    <input type="datetime-local" value={eventForm.gatesOpenAt} onChange={(e) => setEventField("gatesOpenAt", e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Check-in starts">
                    <input type="datetime-local" value={eventForm.checkInStartsAt} onChange={(e) => setEventField("checkInStartsAt", e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Check-in ends">
                    <input type="datetime-local" value={eventForm.checkInEndsAt} onChange={(e) => setEventField("checkInEndsAt", e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Minimum age">
                    <input type="number" min={0} value={eventForm.ageRestriction} onChange={(e) => setEventField("ageRestriction", Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Refund policy" className="md:col-span-2">
                    <textarea value={eventForm.refundPolicy} onChange={(e) => setEventField("refundPolicy", e.target.value)} className="form-textarea" />
                  </Field>
                </div>

                <div className="rounded-3xl border border-border bg-background/70 p-5">
                  <h4 className="font-display text-xl font-bold text-foreground">Allowed check-in methods</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["allowQr", "QR code"],
                      ["allowBarcode", "Barcode"],
                      ["allowNfc", "NFC"],
                      ["allowManual", "Manual"],
                    ].map(([field, label]) => (
                      <label key={field} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-sm font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={Boolean(eventForm[field as keyof EventForm])}
                          onChange={(e) => setEventField(field as keyof EventForm, e.target.checked as never)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <label className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-sm font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={eventForm.transferAllowed}
                      onChange={(e) => setEventField("transferAllowed", e.target.checked)}
                    />
                    Allow ticket transfer
                  </label>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <ReviewCard icon={Calendar} label="Sessions" value={sessions.length} detail={`${draftCapacity} total tickets`} />
                  <ReviewCard icon={Ticket} label="Ticket types" value={sessions.reduce((total, session) => total + session.ticketTypes.length, 0)} detail="Across all sessions" />
                  <ReviewCard icon={Banknote} label="Potential revenue" value={formatCurrency(draftRevenue)} detail="Before fees and discounts" />
                </div>

                <div className="rounded-3xl border border-accent/30 bg-accent/10 p-5">
                  <div className="flex items-start gap-4">
                    <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-accent" />
                    <div>
                      <h4 className="font-bold text-foreground">Ready to publish?</h4>
                      <p className="mt-1 text-sm text-muted">
                        Publishing creates the event, sessions, and ticket inventory in one transaction. You can still manage inventory and bookings after publishing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => setActiveStep((step) => Math.max(1, step - 1))} className="btn-ghost" disabled={activeStep === 1}>
                <ChevronLeft className="h-4 w-4" /> Back
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                {activeStep < wizardSteps.length ? (
                  <button type="button" onClick={() => setActiveStep((step) => Math.min(wizardSteps.length, step + 1))} className="btn-primary">
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="submit" className="btn-primary" disabled={isPublishing}>
                    {isPublishing ? (
                      "Publishing..."
                    ) : (
                      <>
                        <Save className="h-5 w-5" /> Publish event
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </section>

      <ManagementSections
        events={events}
        bookings={bookings}
        users={users}
        loading={loading}
        onDeleteEvent={handleDeleteEvent}
        onPaymentStatusChange={handlePaymentStatusChange}
        onUserRoleChange={handleUserRoleChange}
        setMessage={setMessage}
      />
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn("space-y-2", className)}>
      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
        {required && <span className="text-red-500">*</span>}
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  )
}

function ImageUploadButton({ label, onChange }: { label: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2">
      <UploadCloud className="h-4 w-4 text-accent" />
      {label}
      <input type="file" accept="image/*" className="hidden" onChange={onChange} />
    </label>
  )
}

function ImagePreview({ title, url }: { title: string; url: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-background/70">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="font-bold text-foreground">{title}</p>
        <ImageIcon className="h-4 w-4 text-muted" />
      </div>
      {url ? (
        <img src={url} alt={title} className="h-56 w-full object-cover" />
      ) : (
        <div className="flex h-56 items-center justify-center text-sm text-muted">No image selected</div>
      )}
    </div>
  )
}

function ReviewCard({ icon: Icon, label, value, detail }: { icon: any; label: string; value: any; detail: string }) {
  return (
    <div className="rounded-3xl border border-border bg-background/70 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
          <p className="font-display text-xl font-black text-foreground">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">{detail}</p>
    </div>
  )
}

function ManagementSections({
  events,
  bookings,
  users,
  loading,
  onDeleteEvent,
  onPaymentStatusChange,
  onUserRoleChange,
  setMessage,
}: {
  events: any[]
  bookings: any[]
  users: any[]
  loading: boolean
  onDeleteEvent: (eventId: string) => void
  onPaymentStatusChange: (bookingId: string, newStatus: string) => void
  onUserRoleChange: (userId: string, newRole: string) => void
  setMessage: (message: string) => void
}) {
  return (
    <>
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
                      {event.location?.venue}, {event.location?.city} - {formatDate(event.startsAt)}
                    </p>
                    <p className="mt-3 font-bold text-green-500">
                      Total Capacity: {event.stats?.totalTickets || 0}
                      <span className="ml-2 font-normal text-muted">
                        - {(event.stats?.totalTickets || 0) - (event.stats?.soldTickets || 0)} tickets left
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setMessage("Full event editing will be moved to a dedicated management screen. For now, delete and recreate the event bundle.")}
                      className="btn-ghost"
                    >
                      <Edit className="h-4 w-4" /> Edit
                    </button>
                    <button type="button" onClick={() => onDeleteEvent(event._id)} className="btn-danger">
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
                        onChange={(event) => onPaymentStatusChange(booking._id, event.target.value)}
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
                        onChange={(event) => onUserRoleChange(user._id, event.target.value)}
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
    </>
  )
}
