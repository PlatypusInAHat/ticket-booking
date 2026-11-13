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
const Organizer = lazy(() => import("@/pages/Organizer").then((module) => ({ default: module.Organizer })))
const NotificationSettings = lazy(() =>
  import("@/pages/NotificationSettings").then((module) => ({ default: module.NotificationSettings })),
)
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe").then((module) => ({ default: module.Unsubscribe })))
const NotFound = lazy(() => import("@/pages/NotFound").then((module) => ({ default: module.NotFound })))

// The pages people open next from Home; fetched once the browser is idle so the first click is instant.
const prefetchCommonRoutes = () => {
  import("@/pages/Events")
  import("@/pages/EventDetail")
  import("@/pages/Cart")
}

/** Route-level loading: a thin amber strip under the navbar instead of a spinner over a blank page. */
function PageLoader({ title = "Loading…" }) {
  return (
    <div className="min-h-[50vh]" role="status" aria-label={title}>
      <div className="fixed inset-x-0 top-16 z-40 h-0.5 overflow-hidden bg-surface-2" aria-hidden="true">
        <div className="h-full w-1/3 animate-[route-progress_1.1s_ease-in-out_infinite] bg-accent" />
      </div>
      <span className="sr-only">{title}</span>
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

    const idle = (window as any).requestIdleCallback || ((cb: () => void) => window.setTimeout(cb, 1500))
    idle(prefetchCommonRoutes)

    return () => {
      isMounted = false
    }
  }, [dispatch, token, refreshExpiresAt])

  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <PageLoader title="Checking your session…" />
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
          <Route path="/organizers/:id" element={<Organizer />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />

          <Route element={<PrivateRoute />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/account/notifications" element={<NotificationSettings />} />
          </Route>

          {["admin", "organizer"].includes(user?.role) && (
            <Route element={<PrivateRoute requiredRoles={["admin", "organizer"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          )}
          {user?.role === "admin" && (
            <Route element={<PrivateRoute requiredRole="admin" />}>
              <Route path="/api-management" element={<ApiManagement />} />
            </Route>
          )}

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
