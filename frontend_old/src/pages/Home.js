import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCalendarCheck, FaMapMarkerAlt, FaSearch, FaStar, FaChevronRight } from 'react-icons/fa';
import { eventsAPI } from '../services/api';
import { formatDate } from '../utils/format';
import { eventTypeLabels, getLabel } from '../utils/labels';

function Home() {
  const navigate = useNavigate();
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    eventType: '',
    city: ''
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchFeaturedEvents = async () => {
      try {
        const response = await eventsAPI.getEvents({ limit: 6 }, { signal: controller.signal });
        setFeaturedEvents(response.data.data?.events || []);
      } catch (error) {
        if (error.code === 'ERR_CANCELED') {
          return;
        }
        setFeaturedEvents([]);
      }
    };

    fetchFeaturedEvents();

    return () => controller.abort();
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) {
        params.set(key, value.trim());
      }
    });

    navigate(`/events${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Animated Background Gradients */}
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-neon-cyan/20 rounded-full blur-[120px] animate-blob pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-neon-violet/20 rounded-full blur-[120px] animate-blob animation-delay-2000 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-neon-emerald/20 rounded-full blur-[120px] animate-blob animation-delay-4000 pointer-events-none"></div>
        
        <div className="container relative z-10 grid gap-16 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-1.5 text-sm font-semibold text-neon-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <FaStar className="text-neon-cyan" /> <span>Premium Ticketing Experience</span>
            </div>
            
            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              Elevate Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-rose drop-shadow-[0_0_20px_rgba(139,92,246,0.3)]">Events & Moments</span>
            </h1>
            
            <p className="max-w-2xl text-lg leading-relaxed text-slate-400 font-light">
              Discover, book, and manage your tickets in a cutting-edge platform designed for the ultimate user experience. Secure your spot at the most exclusive events.
            </p>

            <form onSubmit={handleSubmit} className="glass-panel p-4 md:p-3 mt-8">
              <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
                <div className="relative">
                  <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilters(current => ({ ...current, search: event.target.value }))}
                    className="field pl-11 bg-dark-900/50 border-white/5 focus:bg-dark-800"
                    placeholder="Search events..."
                  />
                </div>
                <select
                  value={filters.eventType}
                  onChange={(event) => setFilters(current => ({ ...current, eventType: event.target.value }))}
                  className="field bg-dark-900/50 border-white/5 focus:bg-dark-800"
                >
                  <option value="" className="bg-dark-900">All Categories</option>
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <option key={value} value={value} className="bg-dark-900">{label}</option>
                  ))}
                </select>
                <input
                  value={filters.city}
                  onChange={(event) => setFilters(current => ({ ...current, city: event.target.value }))}
                  className="field bg-dark-900/50 border-white/5 focus:bg-dark-800"
                  placeholder="Location"
                />
                <button type="submit" className="btn-primary py-3 md:w-auto w-full">
                  <FaSearch /> Find
                </button>
              </div>
            </form>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-neon-violet/20 rounded-3xl blur-2xl transform rotate-3 scale-105"></div>
            <div className="glass-panel p-8 relative transform transition-transform duration-500 hover:rotate-2 hover:scale-105">
              <div className="grid gap-6">
                {[
                  { label: 'Active Premium Events', value: `${featuredEvents.length || 4}+`, color: 'text-neon-cyan' },
                  { label: 'Seamless Booking', value: '3 Steps', color: 'text-neon-violet' },
                  { label: 'Concierge Support', value: '24/7', color: 'text-neon-emerald' }
                ].map(({label, value, color}) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/10 pb-6 last:border-0 last:pb-0">
                    <div>
                      <p className={`text-4xl font-black ${color}`}>{value}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-300">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="container py-24 relative z-10">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-black text-white relative inline-block">
              Featured Events
              <span className="absolute -bottom-3 left-0 w-1/3 h-1 bg-gradient-to-r from-neon-cyan to-transparent rounded-full"></span>
            </h2>
            <p className="mt-6 text-slate-400 text-lg">Curated experiences handpicked for you.</p>
          </div>
          <Link to="/events" className="btn-secondary group">
            View All <FaChevronRight className="transition-transform group-hover:translate-x-1 group-hover:text-neon-cyan" />
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {featuredEvents.map(event => (
            <Link key={event._id} to={`/events/${event._id}`} className="glass-card group block overflow-hidden">
              <div className="aspect-[16/10] overflow-hidden relative">
                <div className="absolute inset-0 bg-dark-900/20 group-hover:bg-transparent transition-colors z-10 duration-500"></div>
                <img
                  src={event.coverImage}
                  alt={event.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4 z-20">
                  <span className="badge bg-dark-900/80 backdrop-blur-md border-neon-cyan/30 text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    {getLabel(eventTypeLabels, event.eventType)}
                  </span>
                </div>
              </div>
              
              <div className="p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-neon-violet/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-neon-cyan group-hover:to-neon-violet transition-all duration-300 line-clamp-1">{event.title}</span>
                  </div>
                  
                  <div className="space-y-3 text-sm text-slate-400">
                    <p className="flex items-center gap-3"><FaMapMarkerAlt className="text-neon-cyan text-lg" /> {event.location?.venue}, {event.location?.city}</p>
                    <p className="flex items-center gap-3"><FaCalendarCheck className="text-neon-violet text-lg" /> {formatDate(event.startsAt)}</p>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
                      <span className={`text-sm font-bold ${event.status === 'published' ? 'text-neon-emerald' : 'text-slate-400'}`}>
                        {event.status === 'published' ? 'On Sale' : event.status}
                      </span>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-neon-cyan group-hover:border-neon-cyan group-hover:text-dark-900 transition-colors duration-300">
                      <FaChevronRight />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
