import React, { useCallback, useEffect, useState } from 'react';
import { FaEdit, FaPlus, FaSave, FaTrashAlt, FaChartLine, FaTicketAlt, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import { adminAPI, ticketsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import {
  bookingStatusLabels,
  categoryLabels,
  eventTypeLabels,
  getLabel,
  paymentStatusLabels
} from '../utils/labels';

const emptyTicketForm = {
  eventName: '',
  eventType: 'concert',
  price: 0,
  availableSeats: 1,
  date: '',
  time: '19:00',
  venue: '',
  city: '',
  state: '',
  country: 'Vietnam',
  category: 'standard',
  image: '',
  description: ''
};

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketForm, setTicketForm] = useState(emptyTicketForm);
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      setMessage('Failed to load admin statistics.');
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await adminAPI.getBookings();
      setBookings(response.data.data);
    } catch (error) {
      setMessage('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const response = await ticketsAPI.getAll({ limit: 100 });
      setTickets(response.data.data?.tickets || []);
    } catch (error) {
      setMessage('Failed to load tickets.');
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchBookings();
    fetchTickets();
  }, [fetchBookings, fetchStats, fetchTickets]);

  const handlePaymentStatusChange = async (bookingId, newStatus) => {
    try {
      await adminAPI.updatePaymentStatus(bookingId, newStatus);
      setMessage('Payment status updated successfully.');
      fetchBookings();
      fetchStats();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update payment status.');
    }
  };

  const handleTicketSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    const payload = {
      eventName: ticketForm.eventName,
      eventType: ticketForm.eventType,
      price: Number(ticketForm.price),
      availableSeats: Number(ticketForm.availableSeats),
      totalSeats: Number(ticketForm.availableSeats),
      date: ticketForm.date,
      time: ticketForm.time,
      category: ticketForm.category,
      image: ticketForm.image,
      description: ticketForm.description,
      location: {
        venue: ticketForm.venue,
        city: ticketForm.city,
        state: ticketForm.state,
        country: ticketForm.country
      }
    };

    try {
      if (editingTicketId) {
        await ticketsAPI.update(editingTicketId, payload);
        setMessage('Ticket updated successfully.');
      } else {
        await ticketsAPI.create(payload);
        setMessage('New ticket created successfully.');
      }

      setTicketForm(emptyTicketForm);
      setEditingTicketId(null);
      fetchTickets();
      fetchStats();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save ticket.');
    }
  };

  const startEditingTicket = (ticket) => {
    setEditingTicketId(ticket._id);
    setTicketForm({
      eventName: ticket.eventName,
      eventType: ticket.eventType,
      price: ticket.price,
      availableSeats: ticket.availableSeats,
      date: ticket.date?.slice(0, 10) || '',
      time: ticket.time || '19:00',
      venue: ticket.location?.venue || '',
      city: ticket.location?.city || '',
      state: ticket.location?.state || '',
      country: ticket.location?.country || 'Vietnam',
      category: ticket.category || 'standard',
      image: ticket.image || '',
      description: ticket.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) {
      return;
    }

    try {
      await ticketsAPI.delete(ticketId);
      setMessage('Ticket deleted.');
      fetchTickets();
      fetchStats();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete ticket.');
    }
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: FaUsers, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
    { label: 'Active Tickets', value: stats.totalTickets, icon: FaTicketAlt, color: 'text-neon-violet', bg: 'bg-neon-violet/10' },
    { label: 'Total Bookings', value: stats.totalBookings, icon: FaChartLine, color: 'text-neon-rose', bg: 'bg-neon-rose/10' },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: FaMoneyBillWave, color: 'text-neon-emerald', bg: 'bg-neon-emerald/10' }
  ] : [];

  return (
    <div className="container py-24 relative z-10">
      <div className="absolute top-20 right-0 w-96 h-96 bg-neon-violet/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="mb-10">
        <span className="badge mb-3 bg-neon-rose/10 border-neon-rose/30 text-neon-rose shadow-[0_0_10px_rgba(244,63,94,0.2)]">Admin Control</span>
        <h1 className="text-4xl font-black text-white">Platform Management</h1>
        <p className="mt-2 text-slate-400">Oversee tickets, monitor bookings, and manage the platform.</p>
      </div>

      {message && (
        <div className="mb-8 rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 px-5 py-4 text-sm font-semibold text-neon-cyan backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] relative z-10">
          {message}
        </div>
      )}

      {stats && (
        <section className="mb-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4 relative z-10">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-panel p-6 flex items-center gap-5 overflow-hidden group">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bg} ${color} transition-transform group-hover:scale-110`}>
                <Icon className="text-2xl drop-shadow-md" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="mb-12 grid gap-8 xl:grid-cols-[1fr_1fr] relative z-10">
        <form onSubmit={handleTicketSubmit} className="glass-panel p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h2 className="text-2xl font-black text-white relative inline-block">
                {editingTicketId ? 'Edit Event Ticket' : 'Create New Event'}
                <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-neon-cyan to-transparent rounded-full"></span>
              </h2>
            </div>
            {editingTicketId && (
              <button
                type="button"
                onClick={() => {
                  setEditingTicketId(null);
                  setTicketForm(emptyTicketForm);
                }}
                className="btn-secondary text-xs px-4 py-2"
              >
                <FaPlus /> Cancel Edit
              </button>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Event Name</label>
              <input
                type="text"
                value={ticketForm.eventName}
                onChange={(event) => setTicketForm(current => ({ ...current, eventName: event.target.value }))}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                value={ticketForm.eventType}
                onChange={(event) => setTicketForm(current => ({ ...current, eventType: event.target.value }))}
                className="field bg-dark-900/60"
              >
                {Object.entries(eventTypeLabels).map(([value, label]) => (
                  <option key={value} value={value} className="bg-dark-900">{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ticket Class</label>
              <select
                value={ticketForm.category}
                onChange={(event) => setTicketForm(current => ({ ...current, category: event.target.value }))}
                className="field bg-dark-900/60"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value} className="bg-dark-900">{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Price</label>
              <input
                type="number"
                min="0"
                value={ticketForm.price}
                onChange={(event) => setTicketForm(current => ({ ...current, price: event.target.value }))}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div>
              <label className="label">Available Seats</label>
              <input
                type="number"
                min="1"
                value={ticketForm.availableSeats}
                onChange={(event) => setTicketForm(current => ({ ...current, availableSeats: event.target.value }))}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={ticketForm.date}
                onChange={(event) => setTicketForm(current => ({ ...current, date: event.target.value }))}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div>
              <label className="label">Time</label>
              <input
                type="time"
                value={ticketForm.time}
                onChange={(event) => setTicketForm(current => ({ ...current, time: event.target.value }))}
                className="field bg-dark-900/60"
              />
            </div>
            <div>
              <label className="label">Venue</label>
              <input
                type="text"
                value={ticketForm.venue}
                onChange={(event) => setTicketForm(current => ({ ...current, venue: event.target.value }))}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                type="text"
                value={ticketForm.city}
                onChange={(event) => setTicketForm(current => ({ ...current, city: event.target.value }))}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div className="hidden">
              <label className="label">State/Province</label>
              <input
                type="text"
                value={ticketForm.state}
                onChange={(event) => setTicketForm(current => ({ ...current, state: event.target.value }))}
                className="field bg-dark-900/60"
              />
            </div>
            <div className="hidden">
              <label className="label">Country</label>
              <input
                type="text"
                value={ticketForm.country}
                onChange={(event) => setTicketForm(current => ({ ...current, country: event.target.value }))}
                className="field bg-dark-900/60"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Image URL</label>
              <input
                type="url"
                value={ticketForm.image}
                onChange={(event) => setTicketForm(current => ({ ...current, image: event.target.value }))}
                className="field bg-dark-900/60"
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                value={ticketForm.description}
                onChange={(event) => setTicketForm(current => ({ ...current, description: event.target.value }))}
                rows="4"
                className="field bg-dark-900/60"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary mt-8 py-4 px-8 text-lg w-full">
            <FaSave className="text-xl" /> {editingTicketId ? 'Save Changes' : 'Publish Event'}
          </button>
        </form>

        <div className="glass-panel p-8 flex flex-col h-[900px]">
          <h2 className="text-2xl font-black text-white relative inline-block mb-8 shrink-0">
            Active Inventory
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-neon-violet to-transparent rounded-full"></span>
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {tickets.map(ticket => (
              <article key={ticket._id} className="rounded-2xl border border-white/5 bg-dark-900/40 p-5 hover:bg-dark-900/60 transition-colors">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="badge bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20">{getLabel(eventTypeLabels, ticket.eventType)}</span>
                    </div>
                    <h3 className="font-black text-white text-lg">{ticket.eventName}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {ticket.location?.venue}, {ticket.location?.city} • {formatDate(ticket.date)}
                    </p>
                    <p className="mt-3 font-bold text-neon-emerald">
                      {formatCurrency(ticket.price)} <span className="text-slate-500 font-normal ml-2">• {ticket.availableSeats} tickets left</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => startEditingTicket(ticket)} className="btn-secondary text-xs px-4 py-2">
                      <FaEdit /> Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteTicket(ticket._id)} className="btn-danger text-xs px-4 py-2">
                      <FaTrashAlt /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-panel p-8 relative z-10">
        <h2 className="text-2xl font-black text-white relative inline-block mb-8">
          Booking Management
          <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-neon-emerald to-transparent rounded-full"></span>
        </h2>
        
        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-dark-800/40 border border-white/5" />
        ) : bookings.length === 0 ? (
          <div className="p-10 text-center border border-white/5 rounded-2xl bg-dark-900/40">
            <p className="text-slate-400">No bookings have been made yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-dark-900 border-b border-white/10 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4">Ref ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Tickets</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="bg-dark-800/20 divide-y divide-white/5">
                {bookings.map(booking => (
                  <tr key={booking._id} className="hover:bg-dark-900/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white">{booking.bookingNumber}</td>
                    <td className="px-6 py-4 text-slate-300">{booking.user?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-slate-300">{booking.tickets.reduce((total, item) => total + item.quantity, 0)}</td>
                    <td className="px-6 py-4 font-black text-neon-emerald">{formatCurrency(booking.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <select
                        value={booking.paymentStatus}
                        onChange={(event) => handlePaymentStatusChange(booking._id, event.target.value)}
                        className="field min-w-[170px] bg-dark-900/80 border-white/10 text-xs font-bold"
                      >
                        {Object.entries(paymentStatusLabels).map(([value, label]) => (
                          <option key={value} value={value} className="bg-dark-900">{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 font-bold text-neon-cyan">
                      <span className="px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-xs uppercase tracking-wider">
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
    </div>
  );
}

export default AdminDashboard;
