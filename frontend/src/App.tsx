import { useEffect, useState } from "react"
import { Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Home } from "@/pages/Home"
import { Events } from "@/pages/Events"
import { EventDetail } from "@/pages/EventDetail"
import { Cart } from "@/pages/Cart"

import PrivateRoute from "@/components/PrivateRoute"
import { useAppDispatch, useAppSelector } from "@/store"
import { logout, updateProfileSuccess } from "@/store/authSlice"
import { usersAPI } from "@/services/api"

// We will create these pages next
import { Login } from "@/pages/Login"
import { Register } from "@/pages/Register"
import { Dashboard } from "@/pages/Dashboard"
import { Checkout } from "@/pages/Checkout"
import { PaymentResult } from "@/pages/PaymentResult"
import { AdminDashboard } from "@/pages/AdminDashboard"

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
  const { token, user } = useAppSelector((state: any) => state.auth || {})
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token && !user))

  useEffect(() => {
    let isMounted = true

    const bootstrapProfile = async () => {
      if (!token || user) {
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
  }, [dispatch, token, user])

  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <PageLoader title="Checking authentication..." />
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
          </Route>
        )}

        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
