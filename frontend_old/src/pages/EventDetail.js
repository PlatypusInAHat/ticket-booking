import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FaArrowLeft, FaCalendarAlt, FaMapMarkerAlt, FaShoppingCart, FaTicketAlt, FaInfoCircle } from 'react-icons/fa';
import { addToCart } from '../redux/slices/cartSlice';
import { eventsAPI, ticketsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { eventTypeLabels, getLabel, categoryLabels } from '../utils/labels';

function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for ticket selection
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const fetchData = useCallback(async ({ signal } = {}) => {
    setLoading(true);
    let wasCanceled = false;

    try {
      // Fetch Event and its Tickets in parallel
      const [eventRes, ticketsRes] = await Promise.all([
        eventsAPI.getEventById(id, { signal }),
        ticketsAPI.getAll({ eventId: id, limit: 100 }, { signal })
      ]);
      
      setEvent(eventRes.data.data);
      setTickets(ticketsRes.data.data?.tickets || []);
      
      // Auto-select first available ticket
      const availableTickets = (ticketsRes.data.data?.tickets || []).filter(t => t.availableSeats > 0);
      if (availableTickets.length > 0) {
        setSelectedTicketId(availableTickets[0]._id);
      }
      
    } catch (err) {
      if (err.code === 'ERR_CANCELED') {
        wasCanceled = true;
        return;
      }
      setError('Event not found or no longer available.');
    } finally {
      if (!wasCanceled) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchData]);

  const handleAddToCart = () => {
    if (!selectedTicketId) {
      setError('Please select a ticket category.');
      return;
    }

    const ticketToBuy = tickets.find(t => t._id === selectedTicketId);
    
    if (quantity < 1) {
      setError('Please select at least 1 ticket.');
      return;
    }

    if (quantity > ticketToBuy.availableSeats) {
      setError('Not enough seats available.');
      return;
    }

    // Add selected ticket to cart (Cart expects ticket objects)
    dispatch(addToCart({ ...ticketToBuy, quantity }));
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="container py-20">
        <div className="h-[60vh] animate-pulse rounded-3xl border border-white/5 bg-dark-800/40" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container py-24 text-center">
        <div className="glass-panel p-16 max-w-lg mx-auto">
          <p className="font-bold text-neon-rose text-xl mb-6">{error}</p>
          <Link to="/events" className="btn-primary w-full">Back to Events</Link>
        </div>
      </div>
    );
  }

  const selectedTicketInfo = tickets.find(t => t._id === selectedTicketId);

  return (
    <div className="container py-20 relative z-10">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[150px] pointer-events-none"></div>

      <button onClick={() => navigate(-1)} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors group">
        <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back
      </button>

      <section className="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-8">
          {/* Event Banner */}
          <div className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-dark-800 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent opacity-80 z-10 pointer-events-none"></div>
            <img src={event.coverImage || 'https://via.placeholder.com/1200x600'} alt={event.title} decoding="async" className="aspect-[16/9] w-full object-cover" />
            
            <div className="absolute bottom-6 left-6 z-20 flex flex-wrap gap-3">
              <span className="badge bg-dark-900/80 backdrop-blur-md border-neon-cyan/50 text-neon-cyan px-4 py-1.5 text-sm">
                {getLabel(eventTypeLabels, event.eventType)}
              </span>
            </div>
          </div>

          {/* Event Details */}
          <div className="glass-panel p-8">
            <h2 className="text-2xl font-black text-white relative inline-block">
              About the Event
              <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-neon-cyan to-transparent rounded-full"></span>
            </h2>
            <p className="mt-6 leading-relaxed text-slate-300 font-light text-lg whitespace-pre-wrap">
              {event.description || 'No detailed description available for this event yet.'}
            </p>
          </div>
        </div>

        {/* Sidebar Info & Tickets */}
        <aside className="space-y-8">
          <div className="glass-panel p-8 border-t-4 border-t-neon-cyan shadow-[0_10px_40px_-10px_rgba(6,182,212,0.2)]">
            <h1 className="text-4xl font-black leading-tight text-white mb-8">{event.title}</h1>

            <div className="space-y-5 text-base text-slate-300">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-dark-900/40 border border-white/5">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-neon-cyan/10 text-neon-cyan">
                  <FaMapMarkerAlt className="text-xl" />
                </div>
                <div>
                  <p className="font-semibold text-white">{event.location?.venue}</p>
                  <p className="text-sm text-slate-400">{event.location?.address}, {event.location?.city}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-dark-900/40 border border-white/5">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-neon-violet/10 text-neon-violet">
                  <FaCalendarAlt className="text-xl" />
                </div>
                <div>
                  <p className="font-semibold text-white">{formatDate(event.startsAt)}</p>
                  <p className="text-sm text-slate-400">
                    {new Date(event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {event.endsAt && ` - ${new Date(event.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Selection Area */}
          <div className="glass-panel p-8">
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
              <FaTicketAlt className="text-neon-emerald" /> Select Tickets
            </h2>

            {tickets.length === 0 ? (
              <div className="p-4 rounded-xl bg-dark-900 border border-white/10 text-center text-slate-400">
                No tickets currently available for this event.
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {tickets.map(ticket => (
                  <label 
                    key={ticket._id} 
                    className={`block cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                      selectedTicketId === ticket._id 
                        ? 'border-neon-cyan bg-neon-cyan/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                        : 'border-white/10 bg-dark-900/40 hover:border-white/30'
                    } ${ticket.availableSeats === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <input 
                          type="radio" 
                          name="ticketSelection" 
                          checked={selectedTicketId === ticket._id}
                          onChange={() => ticket.availableSeats > 0 && setSelectedTicketId(ticket._id)}
                          disabled={ticket.availableSeats === 0}
                          className="w-4 h-4 accent-neon-cyan"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-lg text-white">
                            {ticket.ticketName || getLabel(categoryLabels, ticket.category) || 'General Admission'}
                          </h3>
                          <span className="font-black text-neon-emerald text-lg">{formatCurrency(ticket.price)}</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{ticket.description || 'Standard seating or entry'}</p>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className={`px-2 py-1 rounded-md font-semibold ${ticket.availableSeats > 10 ? 'bg-neon-emerald/20 text-neon-emerald' : 'bg-neon-rose/20 text-neon-rose'}`}>
                            {ticket.availableSeats === 0 ? 'Sold Out' : `${ticket.availableSeats} Left`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selectedTicketInfo && (
              <div className="bg-dark-900/60 p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Price</span>
                  <span className="font-semibold">{formatCurrency(selectedTicketInfo.price)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedTicketInfo.availableSeats}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="field bg-dark-800 text-center text-lg font-bold w-24 py-2"
                  />
                </div>

                <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-3xl font-black text-neon-emerald">
                    {formatCurrency(selectedTicketInfo.price * quantity)}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl border border-neon-rose/30 bg-neon-rose/10 px-4 py-3 text-sm font-semibold text-neon-rose text-center flex items-center justify-center gap-2">
                <FaInfoCircle /> {error}
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={!selectedTicketInfo || selectedTicketInfo.availableSeats === 0}
              className="btn-primary mt-8 w-full py-4 text-lg"
            >
              <FaShoppingCart className="text-xl" /> 
              {!selectedTicketInfo ? 'Select a Ticket' : selectedTicketInfo.availableSeats === 0 ? 'Sold Out' : 'Add to Cart'}
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default EventDetail;
