import React from 'react';
import { Link } from 'react-router-dom';
import { FaTwitter, FaFacebookF, FaInstagram } from 'react-icons/fa';

function Footer() {
  return (
    <footer className="mt-20 relative overflow-hidden bg-dark-900 border-t border-white/10">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-violet/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="container relative z-10 grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3 group">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet font-black text-white shadow-glow-violet transition-transform duration-300 group-hover:scale-105">
              TB
            </span>
            <div>
              <p className="font-display font-black text-white text-xl">Ticket<span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-violet">Booking</span></p>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mt-1">Premium Platform</p>
            </div>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-slate-400">
            Immerse yourself in the world of exclusive events. Book, manage, and experience premium ticketing with a cutting-edge platform designed for the future.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <a href="https://twitter.com" aria-label="Twitter" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 transition-all hover:bg-white/10 hover:text-neon-cyan hover:border-neon-cyan">
              <FaTwitter />
            </a>
            <a href="https://facebook.com" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 transition-all hover:bg-white/10 hover:text-neon-cyan hover:border-neon-cyan">
              <FaFacebookF />
            </a>
            <a href="https://instagram.com" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 transition-all hover:bg-white/10 hover:text-neon-cyan hover:border-neon-cyan">
              <FaInstagram />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-6 font-display font-bold text-white text-lg relative inline-block">
            Explore
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-neon-cyan to-transparent rounded-full"></span>
          </h4>
          <ul className="space-y-3 text-sm text-slate-400">
            <li><Link to="/" className="transition-colors hover:text-neon-cyan flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-neon-cyan opacity-0 transition-opacity group-hover:opacity-100"></span> Home</Link></li>
            <li><Link to="/tickets" className="transition-colors hover:text-neon-cyan flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-neon-cyan opacity-0 transition-opacity group-hover:opacity-100"></span> Events</Link></li>
            <li><Link to="/cart" className="transition-colors hover:text-neon-cyan flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-neon-cyan opacity-0 transition-opacity group-hover:opacity-100"></span> Cart</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-6 font-display font-bold text-white text-lg relative inline-block">
            Account
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-neon-violet to-transparent rounded-full"></span>
          </h4>
          <ul className="space-y-3 text-sm text-slate-400">
            <li><Link to="/login" className="transition-colors hover:text-neon-violet">Sign In</Link></li>
            <li><Link to="/register" className="transition-colors hover:text-neon-violet">Create Account</Link></li>
            <li><Link to="/dashboard" className="transition-colors hover:text-neon-violet">Dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-6 font-display font-bold text-white text-lg relative inline-block">
            Support
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-neon-emerald to-transparent rounded-full"></span>
          </h4>
          <ul className="space-y-3 text-sm text-slate-400">
            <li><a href="mailto:hello@ticketbooking.vip" className="transition-colors hover:text-neon-emerald">hello@ticketbooking.vip</a></li>
            <li><a href="tel:+840900000000" className="transition-colors hover:text-neon-emerald">+84 900 000 000</a></li>
            <li className="pt-2"><span className="inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">24/7 Premium Support</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 bg-dark-900 py-6 relative z-10">
        <div className="container flex flex-col md:flex-row items-center justify-between text-sm text-slate-500">
          <p>© 2026 TicketBooking Premium. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
