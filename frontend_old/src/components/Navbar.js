import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaBars,
  FaCalendarAlt,
  FaHome,
  FaShoppingCart,
  FaSignOutAlt,
  FaTimes,
  FaUserCircle
} from 'react-icons/fa';
import { logout } from '../redux/slices/authSlice';
import { clearCart } from '../redux/slices/cartSlice';

function Navbar() {
  const { user, token } = useSelector(state => state.auth);
  const { items } = useSelector(state => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const totalCartItems = items.reduce((total, item) => total + item.quantity, 0);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
      isActive
        ? 'bg-white/10 text-neon-cyan shadow-[inset_0_0_20px_rgba(6,182,212,0.15)] border border-white/5'
        : 'text-slate-300 hover:bg-white/5 hover:text-white'
    }`;

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-x-0 border-t-0 rounded-none bg-dark-900/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3 group" onClick={() => setIsMenuOpen(false)}>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet shadow-glow-cyan transition-transform duration-300 group-hover:rotate-12 group-hover:scale-105">
            <span className="text-xl font-black text-white">TB</span>
          </div>
          <div>
            <span className="block text-xl font-black leading-tight text-white tracking-wide">Ticket<span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-violet">Booking</span></span>
            <span className="block text-[11px] font-medium text-neon-cyan/80 uppercase tracking-widest mt-0.5">Premium Experience</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <NavLink to="/" className={navLinkClass}>
            <FaHome className="text-lg" /> Home
          </NavLink>
          <NavLink to="/events" className={navLinkClass}>
            <FaCalendarAlt className="text-lg" /> Events
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={navLinkClass}>
              <FaUserCircle className="text-lg" /> Dashboard
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link to="/cart" className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-dark-800 border border-white/10 text-slate-300 transition-all duration-300 hover:border-neon-cyan hover:text-neon-cyan hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]" title="Giỏ hàng">
            <FaShoppingCart className="text-xl" />
            {totalCartItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-neon-rose px-1.5 text-[10px] font-black text-white shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse">
                {totalCartItems}
              </span>
            )}
          </Link>

          {token ? (
            <button onClick={handleLogout} className="btn-secondary">
              <FaSignOutAlt /> Logout
            </button>
          ) : (
            <Link to="/login" className="btn-primary">
              Sign In
            </Link>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-dark-800 text-slate-300 md:hidden transition-all hover:bg-white/5 hover:text-white"
          onClick={() => setIsMenuOpen(current => !current)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-white/10 bg-dark-900/95 backdrop-blur-xl md:hidden absolute w-full shadow-glass">
          <div className="container flex flex-col gap-2 p-4">
            <NavLink to="/" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <FaHome /> Home
            </NavLink>
            <NavLink to="/events" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <FaCalendarAlt /> Events
            </NavLink>
            <NavLink to="/cart" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <FaShoppingCart /> Cart ({totalCartItems})
            </NavLink>
            {user && (
              <NavLink to="/dashboard" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
                <FaUserCircle /> Dashboard
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
                Admin
              </NavLink>
            )}
            <div className="h-px bg-white/10 my-2" />
            {token ? (
              <button onClick={handleLogout} className="btn-secondary justify-start w-full">
                <FaSignOutAlt /> Logout
              </button>
            ) : (
              <Link to="/login" className="btn-primary justify-center w-full" onClick={() => setIsMenuOpen(false)}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
