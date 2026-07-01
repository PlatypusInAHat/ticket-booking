import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock, LogIn } from "lucide-react"
import { useAppDispatch } from "@/store"
import { loginFailure, loginSuccess } from "@/store/authSlice"
import { authAPI } from "@/services/api"

export function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await authAPI.login({ email, password })
      const authData = response.data.data

      dispatch(
        loginSuccess({
          user: authData.user,
          token: authData.token,
          refreshToken: authData.refreshToken,
        })
      )
      navigate("/")
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Login failed. Please check your email and password."
      setError(message)
      dispatch(loginFailure(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 py-24">
      <div className="absolute left-1/4 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-accent/20 blur-[120px] pointer-events-none" />
      <div className="absolute right-1/4 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[120px] pointer-events-none" />

      <div className="glass relative z-10 mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative flex flex-col justify-center overflow-hidden border-b border-border bg-surface-2 p-10 lg:border-b-0 lg:border-r">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-accent/10 blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <span className="inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent shadow-[0_0_15px_rgba(var(--accent),0.2)]">
              TicketStage Account
            </span>
            <h1 className="mt-8 font-display text-4xl font-black leading-tight text-foreground">
              Welcome back to <br />
              <span className="bg-gradient-to-r from-accent to-blue-500 bg-clip-text text-transparent">
                TicketStage
              </span>
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              Login to manage your tickets, track your bookings, and access your e-tickets.
            </p>

            <div className="group relative mt-10 overflow-hidden rounded-2xl border border-border bg-surface p-6 text-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="relative z-10 mb-4 flex items-center gap-2 font-bold text-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                Demo Accounts
              </p>
              <div className="relative z-10 space-y-3 text-muted">
                <p className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                  <span>Customer:</span>
                  <code className="rounded bg-surface-3 px-2 py-1 text-accent">user@ticketbooking.com / user12345</code>
                </p>
                <p className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                  <span>Admin:</span>
                  <code className="rounded bg-surface-3 px-2 py-1 text-blue-400">admin@ticketbooking.com / admin12345</code>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center bg-surface p-10 md:p-14">
          <h2 className="text-3xl font-black text-foreground">Sign in</h2>
          <p className="mt-3 text-sm text-muted">Enter your account details to continue.</p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-center text-sm font-semibold text-red-500">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-11 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-11 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              <LogIn className="h-5 w-5" />
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-accent transition-colors hover:text-accent-strong">
              Create a new account
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
