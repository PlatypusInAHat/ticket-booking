import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock, UserPlus, User } from "lucide-react"
import { useAppDispatch } from "@/store"
import { registerSuccess } from "@/store/authSlice"
import { authAPI } from "@/services/api"

export function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.register({
        name,
        email,
        password,
        confirmPassword,
      })
      const authData = response.data.data

      dispatch(
        registerSuccess({
          user: authData.user,
          token: authData.token,
          refreshToken: authData.refreshToken,
        })
      )

      navigate("/")
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4 py-20">
      {/* Decorative background blurs */}
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[150px] pointer-events-none"></div>

      <div className="glass relative z-10 mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-surface/50 p-10 shadow-2xl md:p-12">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-accent via-blue-500 to-purple-500"></div>

        <div className="mb-10 text-center">
          <span className="mb-6 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            Join the Club
          </span>
          <h1 className="font-display text-4xl font-black text-foreground">Create an Account</h1>
          <p className="mt-3 text-muted">Unlock premium features, faster checkout, and exclusive access.</p>
        </div>

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-center text-sm font-semibold text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-foreground">Full Name</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-11 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-foreground">Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-11 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-11 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Min. 6 characters"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirm Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-surface-2 px-11 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong disabled:opacity-50 md:col-span-2"
          >
            <UserPlus className="h-5 w-5" />
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-blue-500 transition-colors hover:text-blue-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
