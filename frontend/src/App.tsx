import { lazy, Suspense, useEffect, useState } from "react"
import { Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"

import PrivateRoute from "@/components/PrivateRoute"
import { useAppDispatch, useAppSelector } from "@/store"
import { logout, updateProfileSuccess } from "@/store/authSlice"
import { usersAPI } from "@/services/api"

const Home = lazy(() => import("@/pages/Home").then((module) => ({ default: module.Home })))
const Events = lazy(() => import("@/pages/Events").then((module) => ({ default: module.Events })))
const EventDetail = lazy(() => import("@/pages/EventDetail").then((module) => ({ default: module.EventDetail })))
const Cart = lazy(() => import("@/pages/Cart").then((module) => ({ default: module.Cart })))
const Login = lazy(() => import("@/pages/Login").then((module) => ({ default: module.Login })))
const Register = lazy(() => import("@/pages/Register").then((module) => ({ default: module.Register })))
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"))
const ResetPassword = lazy(() => import("@/pages/ResetPassword"))
const Dashboard = lazy(() => import("@/pages/Dashboard").then((module) => ({ default: module.Dashboard })))
const Checkout = lazy(() => import("@/pages/Checkout").then((module) => ({ default: module.Checkout })))
const PaymentResult = lazy(() => import("@/pages/PaymentResult").then((module) => ({ default: module.PaymentResult })))
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then((module) => ({ default: module.AdminDashboard })))
const ApiManagement = lazy(() => import("@/pages/ApiManagement").then((module) => ({ default: module.ApiManagement })))

function PageLoader({ title = "Loading interface..." }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="glass px-8 py-6 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
        <p className="text-sm font-bold text-foreground">{title}</p>
      </div>
    </div>
  )
}

export default function App() {
  const dispatch = useAppDispatch()
  const { token, user, refreshExpiresAt } = useAppSelector((state: any) => state.auth || {})
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token))

  useEffect(() => {
    let isMounted = true

    const bootstrapProfile = async () => {
      if (!token) {
        setIsBootstrapping(false)
        return
      }

      if (refreshExpiresAt && Date.parse(refreshExpiresAt) <= Date.now()) {
        dispatch(logout())
        setIsBootstrapping(false)
        return
      }

      try {
        const response = await usersAPI.getProfile()
        if (isMounted) {
          dispatch(updateProfileSuccess(response.data.data))
        }
      } catch (error: any) {
        if (isMounted && [401, 403].includes(error.response?.status)) {
          dispatch(logout())
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false)
        }
      }
    }

    bootstrapProfile()

    return () => {
      isMounted = false
    }
  }, [dispatch, token, refreshExpiresAt])

  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <PageLoader title="Checking your session..." />
      </div>
    )
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/payment/result" element={<PaymentResult />} />

          <Route element={<PrivateRoute />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {user?.role === "admin" && (
            <Route element={<PrivateRoute requiredRole="admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/api-management" element={<ApiManagement />} />
            </Route>
          )}

          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
