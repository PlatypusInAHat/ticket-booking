import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaCalendarCheck, FaRegTimesCircle, FaSave, FaUserCircle, FaCreditCard, FaTicketAlt } from 'react-icons/fa';
import { bookingsAPI, usersAPI } from '../services/api';
import { updateProfileSuccess } from '../redux/slices/authSlice';
import { formatCurrency, formatDate } from '../utils/format';
import {
  bookingStatusLabels,
  getLabel,
  paymentMethodLabels,
  paymentStatusLabels
} from '../utils/labels';

function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address?.street || ''
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [message, setMessage] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const response = await usersAPI.getProfile();
      const profileData = response.data.data;
      setProfile({
        name: profileData.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        address: profileData.address?.street || ''
      });
      dispatch(updateProfileSuccess(profileData));
    } catch (error) {
      setMessage('Failed to load profile.');
    }
  }, [dispatch]);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await bookingsAPI.getAll();
      setBookings(response.data.data);
    } catch (error) {
      setMessage('Failed to load booking history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchBookings();
  }, [fetchBookings, fetchProfile]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingsAPI.cancel(bookingId);
      setMessage('Booking has been cancelled.');
      fetchBookings();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Cannot cancel booking.');
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setMessage('');

    try {
      const response = await usersAPI.updateProfile({
        name: profile.name,
        phone: profile.phone,
        address: {
          street: profile.address
        }
      });
      dispatch(updateProfileSuccess(response.data.data));
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Cannot update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="container py-24 relative z-10">
      <div className="absolute top-20 left-0 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between relative z-10">
        <div>
          <span className="badge mb-3 bg-white/5 border-white/10 text-slate-300">Member Area</span>
          <h1 className="text-4xl font-black text-white">Dashboard</h1>
          <p className="mt-2 text-slate-400">Manage your bookings, tickets, and personal profile.</p>
        </div>
        <div className="glass-panel px-6 py-4 rounded-xl border-white/10 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Welcome Back</p>
            <p className="font-black text-white text-lg">{user?.name}</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-8 rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 px-5 py-4 text-sm font-semibold text-neon-cyan backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] relative z-10">
          {message}
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-4 relative z-10">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all duration-300 ${activeTab === 'bookings' ? 'bg-white/10 text-neon-cyan border border-white/10 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]' : 'bg-dark-800 text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
        >
          <FaTicketAlt className="text-lg" /> My Bookings
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all duration-300 ${activeTab === 'profile' ? 'bg-white/10 text-neon-violet border border-white/10 shadow-[inset_0_0_20px_rgba(139,92,246,0.15)]' : 'bg-dark-800 text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
        >
          <FaUserCircle className="text-lg" /> Profile Settings
        </button>
      </div>

      {activeTab === 'bookings' && (
        <section className="relative z-10">
          {loading ? (
            <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-dark-800/40" />
          ) : bookings.length === 0 ? (
            <div className="glass-panel p-16 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/5 mb-6 border border-white/10">
                <FaCalendarCheck className="text-4xl text-slate-500" />
              </div>
              <h2 className="text-2xl font-black text-white">No Bookings Yet</h2>
              <p className="mt-3 text-slate-400">Your purchased tickets will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map(booking => (
                <article key={booking._id} className="glass-panel p-0 overflow-hidden group">
                  <div className="p-6 md:p-8 bg-gradient-to-r from-dark-800 to-dark-900 border-b border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Booking Ref</p>
                      <p className="font-mono text-lg font-black text-white">{booking.bookingNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Total Amount</p>
                      <p className="font-black text-2xl text-neon-emerald drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{formatCurrency(booking.totalAmount)}</p>
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="grid gap-6 md:grid-cols-2 mb-8">
                      {booking.tickets.map((item, idx) => (
                        <div key={`${booking._id}-${idx}`} className="rounded-xl border border-white/5 bg-dark-900/60 p-5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-neon-cyan"></div>
                          <p className="font-black text-white text-lg">{item.snapshot?.eventName || item.snapshot?.ticketName || 'Vé Sự Kiện'}</p>
                          <div className="flex justify-between items-end mt-4">
                            <p className="text-slate-400">Qty: <span className="font-bold text-white">{item.quantity}</span></p>
                            <p className="font-bold text-neon-cyan">{formatCurrency(item.subtotal)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-5 border-t border-white/5 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${booking.bookingStatus === 'confirmed' ? 'bg-neon-emerald shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-500'}`}></div>
                          <span>Status: <strong className="text-white uppercase tracking-wider text-xs ml-1">{getLabel(bookingStatusLabels, booking.bookingStatus)}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaCreditCard className="text-slate-500" />
                          <span>Payment: <strong className="text-white">{getLabel(paymentStatusLabels, booking.paymentStatus)}</strong> via {getLabel(paymentMethodLabels, booking.paymentMethod)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaCalendarCheck className="text-slate-500" />
                          <span>Date: <strong className="text-white">{formatDate(booking.createdAt)}</strong></span>
                        </div>
                      </div>
                      
                      {booking.bookingStatus !== 'cancelled' && (
                        <button onClick={() => handleCancelBooking(booking._id)} className="btn-danger md:w-auto w-full">
                          <FaRegTimesCircle /> Cancel
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

      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="glass-panel max-w-3xl p-8 md:p-12 relative z-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-violet/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-white mb-8">Personal Information</h2>
          <div className="grid gap-6 md:grid-cols-2 relative z-10">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(event) => setProfile(current => ({ ...current, name: event.target.value }))}
                className="field bg-dark-900/60"
                required
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" value={profile.email} className="field bg-dark-900/40 text-slate-500 border-white/5 cursor-not-allowed" disabled />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(event) => setProfile(current => ({ ...current, phone: event.target.value }))}
                className="field bg-dark-900/60"
              />
            </div>
            <div>
              <label className="label">Account Role</label>
              <input type="text" value={user?.role === 'admin' ? 'Administrator' : 'Customer'} className="field bg-dark-900/40 text-slate-500 border-white/5 cursor-not-allowed uppercase font-bold text-xs tracking-wider" disabled />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <textarea
                value={profile.address}
                onChange={(event) => setProfile(current => ({ ...current, address: event.target.value }))}
                className="field bg-dark-900/60"
                rows="3"
                placeholder="Street, City, Country..."
              />
            </div>
          </div>

          <button type="submit" disabled={isSavingProfile} className="btn-primary mt-8 py-4 px-8 text-lg relative z-10">
            <FaSave className="text-xl" /> {isSavingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}
    </div>
  );
}

export default Dashboard;
