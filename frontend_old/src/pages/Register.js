import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FaEnvelope, FaLock, FaUserPlus, FaUser } from 'react-icons/fa';
import { registerSuccess } from '../redux/slices/authSlice';
import { authAPI } from '../services/api';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.register({
        name,
        email,
        password,
        confirmPassword
      });
      const authData = response.data.data;

      dispatch(registerSuccess({
        user: authData.user,
        token: authData.token
      }));

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-20 relative z-10 flex justify-center min-h-[85vh] items-center">
      {/* Decorative background blurs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-violet/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="glass-panel mx-auto w-full max-w-2xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] md:p-12 relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-rose"></div>
        
        <div className="text-center mb-10">
          <span className="inline-block rounded-full border border-neon-violet/30 bg-neon-violet/10 px-4 py-1.5 text-xs font-bold text-neon-violet shadow-[0_0_15px_rgba(139,92,246,0.2)] mb-6">
            Join the Club
          </span>
          <h1 className="text-4xl font-black text-white">Create an Account</h1>
          <p className="mt-3 text-slate-400">Unlock premium features, faster checkout, and exclusive access.</p>
        </div>

        {error && (
          <div className="mb-8 rounded-xl border border-neon-rose/30 bg-neon-rose/10 px-5 py-4 text-sm font-semibold text-neon-rose text-center shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">Full Name</label>
            <div className="relative">
              <FaUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="field pl-11 bg-dark-900/60"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="label">Email Address</label>
            <div className="relative">
              <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field pl-11 bg-dark-900/60"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field pl-11 bg-dark-900/60"
                placeholder="Min. 6 characters"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <div className="relative">
              <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="field pl-11 bg-dark-900/60"
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary md:col-span-2 mt-4 py-4 text-lg">
            <FaUserPlus className="text-xl" /> {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-neon-violet hover:text-white transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
