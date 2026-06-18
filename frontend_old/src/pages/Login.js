import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa';
import { loginFailure, loginSuccess } from '../redux/slices/authSlice';
import { authAPI } from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login({ email, password });
      const authData = response.data.data;

      dispatch(loginSuccess({
        user: authData.user,
        token: authData.token
      }));
      navigate('/');
    } catch (err) {
      const message = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.';
      setError(message);
      dispatch(loginFailure(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-24 relative z-10 flex min-h-[80vh] items-center justify-center">
      <div className="absolute left-1/4 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-neon-cyan/20 blur-[120px] pointer-events-none" />
      <div className="absolute right-1/4 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-neon-violet/20 blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-dark-800/80 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative flex flex-col justify-center overflow-hidden border-r border-white/5 bg-gradient-to-br from-dark-900 to-dark-800 p-10 text-white">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-neon-cyan/10 blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <span className="inline-block rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-1.5 text-xs font-bold text-neon-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              Tài khoản TicketBooking
            </span>
            <h1 className="mt-8 text-4xl font-black leading-tight text-white">
              Chào mừng trở lại <br />
              <span className="bg-gradient-to-r from-neon-cyan to-neon-violet bg-clip-text text-transparent">
                TicketBooking
              </span>
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-slate-400">
              Đăng nhập để quản lý vé, theo dõi đơn đặt chỗ và mở vé điện tử QR/barcode/NFC của bạn.
            </p>

            <div className="group relative mt-10 overflow-hidden rounded-2xl border border-white/5 bg-dark-900/50 p-6 text-sm backdrop-blur-md">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="relative z-10 mb-4 flex items-center gap-2 font-bold text-white">
                <span className="h-2 w-2 rounded-full bg-neon-emerald shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Tài khoản demo
              </p>
              <div className="relative z-10 space-y-3 text-slate-300">
                <p className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                  <span className="text-slate-500">Khách:</span>
                  <code className="rounded bg-dark-800 px-2 py-1 text-neon-cyan">user@ticketbooking.com / user12345</code>
                </p>
                <p className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                  <span className="text-slate-500">Admin:</span>
                  <code className="rounded bg-dark-800 px-2 py-1 text-neon-violet">admin@ticketbooking.com / admin12345</code>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center bg-dark-900/40 p-10 md:p-14">
          <h2 className="text-3xl font-black text-white">Đăng nhập</h2>
          <p className="mt-3 text-sm text-slate-400">Nhập thông tin tài khoản để tiếp tục.</p>

          {error && (
            <div className="mt-6 rounded-xl border border-neon-rose/30 bg-neon-rose/10 px-5 py-4 text-center text-sm font-semibold text-neon-rose shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field bg-dark-900/60 pl-11"
                  placeholder="ban@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Mật khẩu</label>
              <div className="relative">
                <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field bg-dark-900/60 pl-11"
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-4 w-full py-4 text-lg">
              <FaSignInAlt className="text-xl" />
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-bold text-neon-cyan transition-colors hover:text-white">
              Tạo tài khoản mới
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Login;
