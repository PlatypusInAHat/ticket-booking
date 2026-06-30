import { useCallback, useEffect, useState } from "react"
import { Edit, Plus, Save, Trash2, TrendingUp, Ticket, Users, Banknote, UploadCloud, X, ChevronDown, ChevronUp, Calendar, Image as ImageIcon } from "lucide-react"
import { adminAPI, ticketsAPI, eventsAPI, uploadAPI } from "@/services/api"
import { formatCurrency, formatDate } from "@/utils/format"
import {
  bookingStatusLabels,
  categoryLabels,
  eventTypeLabels,
  getLabel,
  paymentStatusLabels,
} from "@/utils/labels"
import { cn } from "@/lib/utils"
import ReactQuill from "react-quill-new"
import "react-quill-new/dist/quill.snow.css"

export interface TicketType {
  id: string;
  name: string;
  price: number;
  isFree: boolean;
  totalQuantity: number;
  minPerOrder: number;
  maxPerOrder: number;
  saleStart: string;
  saleEnd: string;
  description: string;
  image: string;
}

export interface EventSession {
  id: string;
  startDate: string;
  endDate: string;
  ticketTypes: TicketType[];
  isExpanded: boolean;
}

const emptyTicketForm = {
  eventName: "",
  eventType: "concert",
  price: 0,
  availableSeats: 1,
  date: "",
  time: "19:00",
  venue: "",
  city: "",
  state: "",
  country: "Vietnam",
  category: "standard",
  image: "",
  description: "",
  seatMapMode: "general_admission",
  seatMapRows: 5,
  seatMapCols: 10,
  zoneMapImage: "",
  zoneMapZones: [] as any[],
  organizerName: "",
  organizerInfo: "",
  organizerLogo: "",
}

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ticketForm, setTicketForm] = useState(emptyTicketForm)
  const [users, setUsers] = useState<any[]>([])
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState(1)

  const [sessions, setSessions] = useState<EventSession[]>([{
    id: "session-1",
    startDate: "",
    endDate: "",
    ticketTypes: [],
    isExpanded: true
  }])
  const [editingTicketType, setEditingTicketType] = useState<{sessionId: string, ticketIndex: number | null} | null>(null)
  const [ticketTypeForm, setTicketTypeForm] = useState<TicketType>({
    id: "",
    name: "",
    price: 0,
    isFree: false,
    totalQuantity: 10,
    minPerOrder: 1,
    maxPerOrder: 10,
    saleStart: "",
    saleEnd: "",
    description: "",
    image: ""
  })

  const fetchStats = useCallback(async () => {
    try {
      const response = await adminAPI.getStats()
      setStats(response.data.data)
    } catch (error) {
      setMessage("Failed to load admin statistics.")
    }
  }, [])

  const fetchBookings = useCallback(async () => {
    try {
      const response = await adminAPI.getBookings()
      setBookings(response.data.data)
    } catch (error) {
      setMessage("Failed to load bookings.")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const response = await eventsAPI.getEvents({ limit: 100 })
      setEvents(response.data.data?.events || [])
    } catch (error) {
      setMessage("Failed to load events.")
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await adminAPI.getUsers()
      setUsers(response.data.data || [])
    } catch (error) {
      setMessage("Failed to load users.")
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchBookings()
    fetchEvents()
    fetchUsers()
  }, [fetchBookings, fetchStats, fetchEvents, fetchUsers])

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

  const addSession = () => {
    setSessions(prev => [...prev, {
      id: `session-${Date.now()}`,
      startDate: "",
      endDate: "",
      ticketTypes: [],
      isExpanded: true
    }])
  }

  const removeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  const toggleSession = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isExpanded: !s.isExpanded } : s))
  }

  const updateSession = (id: string, field: keyof EventSession, value: any) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const removeTicketType = (sessionId: string, ticketIndex: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const newTickets = [...s.ticketTypes]
        newTickets.splice(ticketIndex, 1)
        return { ...s, ticketTypes: newTickets }
      }
      return s
    }))
  }

  const openTicketModal = (sessionId: string, ticketIndex: number | null) => {
    if (ticketIndex !== null) {
      const ticket = sessions.find(s => s.id === sessionId)?.ticketTypes[ticketIndex]
      if (ticket) setTicketTypeForm(ticket)
    } else {
      setTicketTypeForm({
        id: `ticket-${Date.now()}`,
        name: "",
        price: 0,
        isFree: false,
        totalQuantity: 10,
        minPerOrder: 1,
        maxPerOrder: 10,
        saleStart: "",
        saleEnd: "",
        description: "",
        image: ""
      })
    }
    setEditingTicketType({ sessionId, ticketIndex })
  }

  const saveTicketType = () => {
    if (!editingTicketType) return

    setSessions(prev => prev.map(s => {
      if (s.id === editingTicketType.sessionId) {
        const newTickets = [...s.ticketTypes]
        if (editingTicketType.ticketIndex !== null) {
          newTickets[editingTicketType.ticketIndex] = ticketTypeForm
        } else {
          newTickets.push(ticketTypeForm)
        }
        return { ...s, ticketTypes: newTickets }
      }
      return s
    }))
    setEditingTicketType(null)
  }

  const handleTicketSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage("")

    try {
      const bundleData = {
        eventData: {
          title: ticketForm.eventName,
          eventType: ticketForm.eventType,
          location: {
            venue: ticketForm.venue,
            city: ticketForm.city,
            state: ticketForm.state,
            country: ticketForm.country,
          },
          organizerDetails: {
            name: ticketForm.organizerName,
            info: ticketForm.organizerInfo,
            logo: ticketForm.organizerLogo
          },
          description: ticketForm.description,
          coverImage: ticketForm.image,
        },
        sessionsData: sessions.filter(s => s.startDate).map(s => ({
          startDate: s.startDate,
          endDate: s.endDate,
          ticketTypes: s.ticketTypes
        }))
      };

      if (bundleData.sessionsData.length === 0 || bundleData.sessionsData.some((s: any) => s.ticketTypes.length === 0)) {
        setMessage("Vui lòng tạo ít nhất một suất diễn và một loại vé cho mỗi suất diễn.");
        return;
      }

      if (editingTicketId) {
        // Updating is currently not supported for bulk edit in this flow, but leaving stub
        setMessage("Editing an entire event bundle is not supported from this screen yet.")
      } else {
        await eventsAPI.createBundle(bundleData);
        setMessage("Sự kiện và các loại vé đã được tạo thành công!");
      }

      setTicketForm(emptyTicketForm)
      setSessions([{
        id: `session-${Date.now()}`,
        startDate: "",
        endDate: "",
        ticketTypes: [],
        isExpanded: true
      }])
      setEditingTicketId(null)
      fetchEvents() // Note: you might want to fetchEvents instead of tickets later
      fetchStats()
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to save event bundle.")
    }
  }

  const startEditingTicket = (ticket: any) => {
    setEditingTicketId(ticket._id)
    setTicketForm({
      eventName: ticket.eventName,
      eventType: ticket.eventType,
      price: ticket.price,
      availableSeats: ticket.availableSeats,
      date: ticket.date?.slice(0, 10) || "",
      time: ticket.time || "19:00",
      venue: ticket.location?.venue || "",
      city: ticket.location?.city || "",
      state: ticket.location?.state || "",
      country: ticket.location?.country || "Vietnam",
      category: ticket.category || "standard",
      image: ticket.image || "",
      description: ticket.description || "",
      seatMapMode: ticket.seatMap?.mode || (ticket.zoneMap ? "zone_map" : "general_admission"),
      seatMapRows: 5, 
      seatMapCols: 10,
      zoneMapImage: ticket.zoneMap?.backgroundImage || "",
      zoneMapZones: ticket.zoneMap?.zones || [],
      organizerName: ticket.organizerDetails?.name || "",
      organizerInfo: ticket.organizerDetails?.info || "",
      organizerLogo: ticket.organizerDetails?.logo || "",
    })
    setActiveTab(1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return
    }

    try {
      await eventsAPI.delete(eventId)
      setMessage("Event deleted successfully.")
      fetchEvents()
      fetchStats()
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to delete event.")
    }
  }

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Active Tickets", value: stats.totalTickets, icon: Ticket, color: "text-purple-500", bg: "bg-purple-500/10" },
        { label: "Total Bookings", value: stats.totalBookings, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
        { label: "Revenue", value: formatCurrency(stats.totalRevenue), icon: Banknote, color: "text-green-500", bg: "bg-green-500/10" },
      ]
    : []

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
        <div className="relative z-10 mb-8 rounded-xl border border-accent/30 bg-accent/10 px-5 py-4 text-sm font-semibold text-accent shadow-[0_0_15px_rgba(var(--accent),0.15)] backdrop-blur-md">
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

      <section className="relative z-10 mb-12">
        <div className="glass rounded-2xl border border-border overflow-hidden">
          {/* Wizard Header */}
          <div className="flex flex-wrap border-b border-border bg-surface-2/50">
            {[
              { id: 1, label: "Thông tin sự kiện" },
              { id: 2, label: "Thời gian & Loại vé" },
              { id: 3, label: "Cài đặt" },
              { id: 4, label: "Thông tin thanh toán" },
            ].map((step, idx) => (
              <div 
                key={step.id}
                onClick={() => setActiveTab(step.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 py-4 px-4 cursor-pointer text-sm font-semibold transition-colors relative",
                  activeTab === step.id ? "text-accent bg-surface-3" : "text-muted hover:text-foreground hover:bg-surface-2"
                )}
              >
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  activeTab === step.id ? "bg-accent text-accent-foreground" : "bg-surface text-muted"
                )}>
                  {step.id}
                </div>
                {step.label}
                {idx < 3 && (
                  <div className="absolute right-0 top-1/2 -mt-2 -mr-2 hidden lg:block z-10">
                    <div className="w-4 h-4 border-t border-r border-border rotate-45"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

        <form onSubmit={handleTicketSubmit} className="p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h2 className="relative inline-block font-display text-2xl font-black text-foreground">
                {editingTicketId ? "Edit Event Ticket" : "Create New Event"}
              </h2>
            </div>
            {editingTicketId && (
              <button
                type="button"
                onClick={() => {
                  setEditingTicketId(null)
                  setTicketForm(emptyTicketForm)
                }}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-3"
              >
                <Plus className="h-4 w-4 rotate-45" /> Cancel Edit
              </button>
            )}
          </div>

          {activeTab === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* React Quill Section */}
              <div className="rounded-xl border border-border bg-[#2A2D34] overflow-hidden">
                <ReactQuill 
                  theme="snow" 
                  value={ticketForm.description} 
                  onChange={(val) => setTicketForm(cur => ({ ...cur, description: val }))}
                  className="text-white min-h-[300px] [&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-[#2A2D34] [&_.ql-container]:border-none [&_.ql-container]:bg-[#2A2D34] [&_.ql-editor]:min-h-[300px]"
                  placeholder="Giới thiệu sự kiện..."
                />
              </div>

              {/* Organizer Section */}
              <div className="rounded-xl border border-border bg-[#2A2D34] p-6">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Logo Upload */}
                  <div className="shrink-0">
                    <label className="flex h-[220px] w-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-500 bg-[#353841] text-gray-400 transition-colors hover:border-accent hover:text-white">
                      {ticketForm.organizerLogo ? (
                         <img src={ticketForm.organizerLogo} alt="Logo" className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        <>
                          <div className="w-12 h-12 mb-2 rounded-full bg-accent/20 flex items-center justify-center">
                            <Ticket className="h-6 w-6 text-accent" />
                          </div>
                          <p className="text-sm font-semibold text-white">Thêm logo ban tổ chức</p>
                          <p className="text-xs">(275x275)</p>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          try {
                            const res = await uploadAPI.uploadImage(file)
                            setTicketForm((current) => ({ ...current, organizerLogo: res.data.url }))
                            setMessage("Logo uploaded successfully.")
                          } catch (err: any) {
                            setMessage(err.response?.data?.error || "Logo upload failed.")
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Organizer Info Inputs */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <label className="text-sm font-semibold text-white mb-2 flex items-center gap-1">
                        <span className="text-red-500">*</span> Tên ban tổ chức
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={80}
                          value={ticketForm.organizerName}
                          onChange={(event) => setTicketForm((current) => ({ ...current, organizerName: event.target.value }))}
                          className="flex h-12 w-full rounded-lg border-none bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent pr-16"
                          placeholder="Tên ban tổ chức"
                          required
                        />
                        <span className="absolute right-4 top-3.5 text-xs text-gray-400 font-medium">
                          {ticketForm.organizerName.length} / 80
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-white mb-2 flex items-center gap-1">
                        <span className="text-red-500">*</span> Thông tin ban tổ chức
                      </label>
                      <div className="relative h-full">
                        <textarea
                          maxLength={500}
                          value={ticketForm.organizerInfo}
                          onChange={(event) => setTicketForm((current) => ({ ...current, organizerInfo: event.target.value }))}
                          className="flex min-h-[120px] w-full rounded-lg border-none bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent pr-4 pb-8"
                          placeholder="Thông tin ban tổ chức"
                          required
                        />
                        <span className="absolute right-4 bottom-3 text-xs text-gray-400 font-medium">
                          {ticketForm.organizerInfo.length} / 500
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location and Image Section */}
              <div className="rounded-xl border border-border bg-[#2A2D34] p-6">
                <h3 className="text-lg font-bold text-white mb-6">Địa điểm & Hình ảnh</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white flex items-center gap-1">
                      <span className="text-red-500">*</span> Địa điểm tổ chức
                    </label>
                    <input
                      type="text"
                      value={ticketForm.venue}
                      onChange={(event) => setTicketForm((current) => ({ ...current, venue: event.target.value }))}
                      className="flex h-12 w-full rounded-lg border-none bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="VD: Sân vận động Mỹ Đình"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white flex items-center gap-1">
                      <span className="text-red-500">*</span> Tỉnh/Thành phố
                    </label>
                    <input
                      type="text"
                      value={ticketForm.city}
                      onChange={(event) => setTicketForm((current) => ({ ...current, city: event.target.value }))}
                      className="flex h-12 w-full rounded-lg border-none bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="VD: Hà Nội"
                      required
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-white flex items-center gap-1">
                      <span className="text-red-500">*</span> Ảnh sự kiện (Banner)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input
                        type="url"
                        value={ticketForm.image}
                        onChange={(event) => setTicketForm((current) => ({ ...current, image: event.target.value }))}
                        className="flex h-12 w-full rounded-lg border-none bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="https://... hoặc tải ảnh lên"
                        required
                      />
                      <label className="flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#353841] px-6 font-semibold text-white transition-colors hover:bg-surface-3">
                        <UploadCloud className="h-5 w-5 text-accent" /> Tải ảnh lên
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            try {
                              const res = await uploadAPI.uploadImage(file)
                              setTicketForm((current) => ({ ...current, image: res.data.url }))
                              setMessage("Banner uploaded successfully.")
                            } catch (err: any) {
                              setMessage(err.response?.data?.error || "Banner upload failed.")
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Thời gian và Loại vé</h3>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={addSession} className="flex items-center gap-2 rounded-lg border border-accent text-accent px-4 py-2 text-sm font-semibold hover:bg-accent/10 transition-colors">
                    Tạo suất diễn <Plus className="h-4 w-4" />
                  </button>
                  <select className="bg-white text-black h-10 px-4 rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm">
                    <option>Tất cả</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                {sessions.map((session, sIdx) => (
                  <div key={session.id} className="rounded-xl border border-red-900/50 bg-[#2A2D34] overflow-hidden">
                    {/* Session Header */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-3 transition-colors border-b border-border/50"
                      onClick={() => toggleSession(session.id)}
                    >
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        {session.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Ngày sự kiện
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeSession(session.id); }} className="text-red-500 hover:text-red-400 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Session Body */}
                    {session.isExpanded && (
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-sm text-white mb-2 block font-medium">Thời gian bắt đầu</label>
                            <div className="relative">
                              <input type="datetime-local" value={session.startDate} onChange={(e) => updateSession(session.id, 'startDate', e.target.value)} className="w-full h-12 bg-white text-black rounded-lg px-4 focus:ring-2 focus:ring-accent outline-none" />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-white mb-2 block font-medium">Thời gian kết thúc</label>
                            <div className="relative">
                              <input type="datetime-local" value={session.endDate} onChange={(e) => updateSession(session.id, 'endDate', e.target.value)} className="w-full h-12 bg-white text-black rounded-lg px-4 focus:ring-2 focus:ring-accent outline-none" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-white mb-4 block flex items-center gap-1">
                            <span className="text-red-500">*</span> Loại vé
                          </label>
                          
                          {session.ticketTypes.length > 0 ? (
                            <div className="space-y-3 mb-4">
                              {session.ticketTypes.map((ticket, tIdx) => (
                                <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface-3">
                                  <div>
                                    <p className="font-semibold text-white">{ticket.name}</p>
                                    <p className="text-sm text-muted">{ticket.isFree ? 'Miễn phí' : formatCurrency(ticket.price)} • {ticket.totalQuantity} vé</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => openTicketModal(session.id, tIdx)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit className="w-4 h-4" /></button>
                                    <button type="button" onClick={() => removeTicketType(session.id, tIdx)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <div className="flex justify-center">
                            <button 
                              type="button" 
                              onClick={() => openTicketModal(session.id, null)} 
                              className="flex items-center gap-2 text-[#22c55e] font-semibold hover:text-[#1ea850] transition-colors py-2"
                            >
                              <Plus className="w-4 h-4" /> Tạo loại vé mới
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-10 bg-surface-2/30 rounded-2xl border border-border">
              <h3 className="text-xl font-bold text-foreground mb-2">Cài đặt hiển thị</h3>
              <p className="text-muted max-w-md mx-auto">Các cài đặt khác sẽ được bổ sung ở đây.</p>
            </div>
          )}

          {activeTab === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-10 bg-surface-2/30 rounded-2xl border border-border">
              <div className="w-16 h-16 mx-auto mb-4 bg-accent/20 rounded-full flex items-center justify-center text-accent">
                 <Banknote className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Thông tin thanh toán</h3>
              <p className="text-muted max-w-md mx-auto">Thiết lập tài khoản ngân hàng hoặc cổng thanh toán để nhận doanh thu từ sự kiện này.</p>
            </div>
          )}

          <div className="mt-8 flex justify-between items-center border-t border-border pt-6">
            <button 
              type="button" 
              onClick={() => setActiveTab(prev => Math.max(1, prev - 1))}
              className={cn("flex items-center justify-center gap-2 rounded-xl border border-border px-8 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-3", activeTab === 1 && "opacity-0 pointer-events-none")}
            >
              Trở lại
            </button>

            {activeTab < 4 ? (
               <button 
                 type="button" 
                 onClick={() => setActiveTab(prev => Math.min(4, prev + 1))}
                 className="flex items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
               >
                 Tiếp tục
               </button>
            ) : (
              <button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong">
                <Save className="h-5 w-5" /> {editingTicketId ? "Save Changes" : "Publish Event"}
              </button>
            )}
          </div>
        </form>
        </div>
      </section>

      <section className="relative z-10 mb-12">
        <div className="glass flex flex-col rounded-2xl border border-border p-8">
          <h2 className="mb-8 shrink-0 relative inline-block font-display text-2xl font-black text-foreground">
            Active Inventory
          </h2>

          <div className="custom-scrollbar space-y-4 overflow-y-auto pr-2">
            {events.map((event: any) => (
              <article key={event._id} className="rounded-2xl border border-border bg-surface-2 p-5 transition-colors hover:bg-surface-3">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="inline-block rounded-full border border-accent/20 bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                        {getLabel(eventTypeLabels, event.eventType)}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-foreground">{event.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {event.location?.venue}, {event.location?.city} • {formatDate(event.startsAt)}
                    </p>
                    <p className="mt-3 font-bold text-green-500">
                      Total Capacity: {event.stats?.totalTickets || 0}
                      <span className="ml-2 font-normal text-muted">• {event.stats?.totalTickets - (event.stats?.soldTickets || 0)} tickets left</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setMessage("Chỉnh sửa trọn bộ sự kiện sẽ được tách thành màn quản trị riêng. Hiện tại bạn có thể xoá và tạo lại bundle sự kiện.")}
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

      <section className="glass relative z-10 rounded-2xl border border-border p-8">
        <h2 className="mb-8 relative inline-block font-display text-2xl font-black text-foreground">
          Booking Management
        </h2>

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
        <h2 className="mb-8 relative inline-block font-display text-2xl font-black text-foreground">
          User Management
        </h2>

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
        <h2 className="mb-8 relative inline-block font-display text-2xl font-black text-foreground">
          Event Statistics
        </h2>

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
                  const total = event.stats?.totalTickets || 0;
                  const sold = event.stats?.soldTickets || 0;
                  const revenue = event.stats?.revenue || 0;
                  const fillRate = total > 0 ? (sold / total) * 100 : 0;
                  
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
                            <div 
                              className="h-full bg-accent transition-all duration-500" 
                              style={{ width: `${Math.min(fillRate, 100)}%` }} 
                            />
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
      {/* Ticket Type Modal */}
      {editingTicketType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#2A2D34] shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-center border-b border-border p-6 relative">
              <h3 className="text-xl font-bold text-white">Tạo loại vé mới</h3>
              <button type="button" onClick={() => setEditingTicketType(null)} className="absolute right-6 text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white flex items-center gap-1"><span className="text-red-500">*</span> Tên vé</label>
                <div className="relative">
                  <input type="text" maxLength={50} value={ticketTypeForm.name} onChange={e => setTicketTypeForm(p => ({ ...p, name: e.target.value }))} className="w-full h-12 rounded-lg bg-white text-black px-4 pr-16 outline-none focus:ring-2 focus:ring-accent" placeholder="Tên vé" />
                  <span className="absolute right-4 top-3.5 text-xs text-gray-400">{ticketTypeForm.name.length} / 50</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1"><span className="text-red-500">*</span> Giá vé</label>
                  <div className="flex items-center gap-4">
                    <input type="number" disabled={ticketTypeForm.isFree} value={ticketTypeForm.isFree ? 0 : ticketTypeForm.price} onChange={e => setTicketTypeForm(p => ({ ...p, price: Number(e.target.value) }))} className="w-full h-12 rounded-lg bg-white text-black px-4 outline-none focus:ring-2 focus:ring-accent disabled:bg-gray-200" />
                    <label className="flex items-center gap-2 text-white shrink-0 cursor-pointer text-sm">
                      <input type="checkbox" checked={ticketTypeForm.isFree} onChange={e => setTicketTypeForm(p => ({ ...p, isFree: e.target.checked, price: e.target.checked ? 0 : p.price }))} className="w-4 h-4 rounded border-gray-400 text-accent focus:ring-accent" />
                      Miễn phí
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1"><span className="text-red-500">*</span> Tổng số lượng vé</label>
                  <input type="number" value={ticketTypeForm.totalQuantity} onChange={e => setTicketTypeForm(p => ({ ...p, totalQuantity: Number(e.target.value) }))} className="w-full h-12 rounded-lg bg-white text-black px-4 outline-none focus:ring-2 focus:ring-accent" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1"><span className="text-red-500">*</span> Số vé tối thiểu trong một đơn hàng</label>
                  <input type="number" value={ticketTypeForm.minPerOrder} onChange={e => setTicketTypeForm(p => ({ ...p, minPerOrder: Number(e.target.value) }))} className="w-full h-12 rounded-lg bg-white text-black px-4 outline-none focus:ring-2 focus:ring-accent" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1"><span className="text-red-500">*</span> Số vé tối đa trong một đơn hàng</label>
                  <input type="number" value={ticketTypeForm.maxPerOrder} onChange={e => setTicketTypeForm(p => ({ ...p, maxPerOrder: Number(e.target.value) }))} className="w-full h-12 rounded-lg bg-white text-black px-4 outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1"><span className="text-red-500">*</span> Thời gian bắt đầu bán vé</label>
                  <div className="relative">
                    <input type="datetime-local" value={ticketTypeForm.saleStart} onChange={e => setTicketTypeForm(p => ({ ...p, saleStart: e.target.value }))} className="w-full h-12 rounded-lg bg-white text-black px-4 outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1"><span className="text-red-500">*</span> Thời gian kết thúc bán vé</label>
                  <div className="relative">
                    <input type="datetime-local" value={ticketTypeForm.saleEnd} onChange={e => setTicketTypeForm(p => ({ ...p, saleEnd: e.target.value }))} className="w-full h-12 rounded-lg bg-white text-black px-4 outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1">Thông tin vé</label>
                  <div className="relative h-full">
                    <textarea maxLength={1000} value={ticketTypeForm.description} onChange={e => setTicketTypeForm(p => ({ ...p, description: e.target.value }))} className="w-full min-h-[160px] h-full rounded-lg bg-white text-black px-4 py-3 outline-none focus:ring-2 focus:ring-accent" placeholder="Description"></textarea>
                    <span className="absolute right-4 bottom-3 text-xs text-gray-400">{ticketTypeForm.description.length} / 1000</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1">Hình ảnh vé</label>
                  <label className="flex flex-col items-center justify-center w-full min-h-[160px] rounded-lg border-2 border-dashed border-gray-500 bg-[#353841] cursor-pointer hover:border-accent hover:text-white text-gray-400 transition-colors">
                    {ticketTypeForm.image ? (
                      <img src={ticketTypeForm.image} alt="Ticket" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-[#22c55e] mb-2" />
                        <span className="text-sm text-white font-semibold mb-1">Thêm</span>
                        <span className="text-xs font-bold text-gray-400">1MB</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const res = await uploadAPI.uploadImage(file);
                        setTicketTypeForm(p => ({ ...p, image: res.data.url }));
                        setMessage("Ticket image uploaded");
                      } catch (err: any) {
                        setMessage(err.response?.data?.error || "Upload failed");
                      }
                    }} />
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#2A2D34] p-8 flex justify-center rounded-b-xl border-t border-border/50">
              <button type="button" onClick={saveTicketType} className="w-full h-12 bg-[#22c55e] hover:bg-[#1ea850] text-white font-bold rounded-lg transition-colors">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
