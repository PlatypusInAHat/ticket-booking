import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import Footer from './components/Footer';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { logout, updateProfileSuccess } from './redux/slices/authSlice';
import { usersAPI } from './services/api';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const EventList = lazy(() => import('./pages/EventList'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));

const PageLoader = ({ title = 'Đang tải giao diện...' }) => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="glass-panel px-8 py-6 text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-neon-cyan/20 border-t-neon-cyan" />
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">Chỉ tải phần cần dùng để app chạy nhẹ hơn.</p>
    </div>
  </div>
);

function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector(state => state.auth);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token && !user));

  useEffect(() => {
    let isMounted = true;

    const bootstrapProfile = async () => {
      if (!token || user) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const response = await usersAPI.getProfile();
        if (isMounted) {
          dispatch(updateProfileSuccess(response.data.data));
        }
      } catch (error) {
        if (isMounted && [401, 403].includes(error.response?.status)) {
          dispatch(logout());
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapProfile();

    return () => {
      isMounted = false;
    };
  }, [dispatch, token, user]);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <PageLoader title="Đang kiểm tra phiên đăng nhập..." />
      </div>
    );
  }

  return (
    <Router>
      <Navbar />
      <main className="page-shell">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/payment/result" element={<PaymentResult />} />

            <Route element={<PrivateRoute />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            {user?.role === 'admin' && (
              <Route element={<PrivateRoute requiredRole="admin" />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            )}

            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
