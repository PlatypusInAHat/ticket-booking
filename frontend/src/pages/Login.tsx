import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { LogIn } from "lucide-react"
import { AuthCard } from "@/components/layout/AuthCard"
import { Button } from "@/components/ui/Button"
import { useAppDispatch } from "@/store"
import { loginFailure, loginSuccess } from "@/store/authSlice"
import { authAPI } from "@/services/api"

// Seeded accounts from the backend seed script, shown so reviewers can try both roles.
const demoAccounts = [
  { role: "Customer", email: "user@ticketbooking.com", password: "user12345" },
  { role: "Admin", email: "admin@ticketbooking.com", password: "admin12345" },
]

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
          expiresAt: authData.expiresAt,
          refreshExpiresAt: authData.refreshExpiresAt,
        })
      )
      navigate("/")
    } catch (err: any) {
      const message = err.response?.data?.message || "We couldn't sign you in. Check your email and password, then try again."
      setError(message)
      dispatch(loginFailure(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to see your tickets and bookings."
      footer={
        <>
          New to TicketStage?{" "}
          <Link to="/register" className="font-semibold text-accent hover:text-accent-strong">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <p className="alert-danger" role="alert">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="login-email" className="form-label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="name@example.com"
            required
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Link to="/forgot-password" className="text-sm text-accent hover:text-accent-strong">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm font-medium">Demo accounts</p>
        <p className="mt-1 text-xs text-muted">Select one to fill in the form.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {demoAccounts.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => {
                setEmail(account.email)
                setPassword(account.password)
                setError("")
              }}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
            >
              <span className="block text-sm font-semibold">{account.role}</span>
              <span className="block truncate text-xs text-muted">{account.email}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthCard>
  )
}
