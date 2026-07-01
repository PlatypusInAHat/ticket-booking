import { useState } from "react"
import { Link } from "react-router-dom"
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { authAPI } from "@/services/api"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await authAPI.forgotPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Forgot Password
          </h2>
          <p className="mt-2 text-sm text-muted">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <div className="glass mt-8 rounded-2xl border border-border p-8 shadow-xl">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="text-xl font-bold text-foreground">Email sent!</h3>
              <p className="text-muted">
                We have sent a password reset link to <strong>{email}</strong>. Please check your inbox.
              </p>
              <div className="pt-4">
                <Link to="/login" className="text-accent hover:underline font-medium">
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-muted" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent-strong focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Link"}
                </button>
              </div>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center text-sm font-medium text-muted hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
