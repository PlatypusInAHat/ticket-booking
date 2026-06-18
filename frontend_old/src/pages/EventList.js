import React, { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaCalendarAlt, FaMapMarkerAlt, FaSearch, FaTicketAlt } from 'react-icons/fa';
import {
  fetchEventsStart,
  fetchEventsSuccess,
  fetchEventsFailure
} from '../redux/slices/eventSlice';
import { eventsAPI } from '../services/api';
import { formatDate } from '../utils/format';
import { eventTypeLabels, getLabel } from '../utils/labels';
import useDebouncedValue from '../hooks/useDebouncedValue';

function EventList() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { events, isLoading, error, pagination } = useSelector(state => state.events);
  const [eventType, setEventType] = useState(searchParams.get('eventType') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const debouncedEventType = useDebouncedValue(eventType.trim(), 300);
  const debouncedCity = useDebouncedValue(city.trim(), 300);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const deferredEvents = useDeferredValue(events);

  const fetchEvents = useCallback(async ({ signal } = {}) => {
    dispatch(fetchEventsStart());
    try {
      const response = await eventsAPI.getEvents({
        eventType: debouncedEventType || undefined,
        city: debouncedCity || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 9
      }, {
        signal
      });

      dispatch(fetchEventsSuccess(response.data.data));
    } catch (err) {
      if (err.code === 'ERR_CANCELED') {
        return;
      }
      dispatch(fetchEventsFailure(err.response?.data?.message || 'Failed to load events.'));
    }
  }, [debouncedCity, debouncedEventType, debouncedSearch, dispatch, page]);

  useEffect(() => {
    const controller = new AbortController();

    fetchEvents({ signal: controller.signal });

    return () => controller.abort();
  }, [fetchEvents]);

  const resetFilters = () => {
    setSearch('');
    setEventType('');
    setCity('');
    setPage(1);
  };

  return (
    <div className="container py-24 relative z-10">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="badge mb-3 bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.2)]">Premium Events Collection</span>
          <h1 className="text-4xl font-black text-white">Upcoming Events</h1>
          <p className="mt-2 text-slate-400">Discover and filter through our exclusive selection of events.</p>
        </div>
        <div className="glass-panel px-5 py-2.5 rounded-xl border-white/10 text-sm font-bold text-neon-cyan shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]">
          {pagination.total || 0} Results Found
        </div>
      </div>

      <section className="mb-12 glass-panel p-5 relative overflow-hidden">
        {/* Glow effect for filter panel */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-violet/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_auto_auto]">
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event name..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="field pl-11 bg-dark-900/50"
            />
          </div>

          <select
            value={eventType}
            onChange={(event) => {
              setEventType(event.target.value);
              setPage(1);
            }}
            className="field bg-dark-900/50"
          >
            <option value="" className="bg-dark-900">All Categories</option>
            {Object.entries(eventTypeLabels).map(([value, label]) => (
              <option key={value} value={value} className="bg-dark-900">{label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="City Location"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setPage(1);
            }}
            className="field bg-dark-900/50"
          />

          <button onClick={() => setPage(1)} className="btn-primary w-full md:w-auto">
            <FaSearch /> Search
          </button>
          <button onClick={resetFilters} className="btn-secondary w-full md:w-auto">
            Reset
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-8 rounded-xl border border-neon-rose/30 bg-neon-rose/10 px-5 py-4 text-sm font-semibold text-neon-rose backdrop-blur-md shadow-[0_0_15px_rgba(244,63,94,0.15)]">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-96 animate-pulse rounded-2xl border border-white/5 bg-dark-800/40" />
          ))}
        </div>
      ) : deferredEvents.length === 0 ? (
        <div className="glass-panel p-16 text-center mt-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/5 mb-6 border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]">
            <FaTicketAlt className="text-4xl text-slate-500" />
          </div>
          <h2 className="text-2xl font-black text-white">No Events Found</h2>
          <p className="mt-3 text-slate-400">Try adjusting your search filters or exploring different categories.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {deferredEvents.map(event => (
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
                  <div className="absolute top-4 left-4 z-20 flex gap-2 flex-wrap">
                    <span className="badge bg-dark-900/80 backdrop-blur-md border-neon-cyan/30 text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                      {getLabel(eventTypeLabels, event.eventType)}
                    </span>
                  </div>
                </div>

                <div className="p-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <h2 className="min-h-[3.5rem] overflow-hidden text-xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-neon-cyan group-hover:to-neon-violet transition-all duration-300">
                      {event.title}
                    </h2>

                    <div className="mt-4 space-y-3 text-sm text-slate-400">
                      <p className="flex items-center gap-3">
                        <FaMapMarkerAlt className="text-neon-cyan text-lg" />
                        {event.location?.venue}, {event.location?.city}
                      </p>
                      <p className="flex items-center gap-3">
                        <FaCalendarAlt className="text-neon-violet text-lg" />
                        {formatDate(event.startsAt)}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                      <span className={`text-sm font-bold ${event.status === 'published' ? 'text-neon-emerald' : 'text-slate-400'}`}>
                        {event.status === 'published' ? 'Tickets Available' : event.status}
                      </span>
                      <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-neon-cyan group-hover:border-neon-cyan group-hover:text-dark-900 transition-colors duration-300">
                        <FaTicketAlt />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage(current => Math.max(1, current - 1))}
              disabled={page === 1}
              className="btn-secondary"
            >
              Previous
            </button>
            <span className="glass-panel px-6 py-3 rounded-xl text-sm font-bold text-white border-white/10">
              Page <span className="text-neon-cyan">{pagination.page}</span> of {pagination.pages || 1}
            </span>
            <button
              onClick={() => setPage(current => current + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn-primary"
            >
              Next Page
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default EventList;
