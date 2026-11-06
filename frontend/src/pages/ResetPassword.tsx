import { useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { CheckCircle2 } from "lucide-react"
import { AuthCard } from "@/components/layout/AuthCard"
import { Button } from "@/components/ui/Button"
import { authAPI } from "@/services/api"

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const navigate = useNavigate()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  if (!token) {
    return (
      <AuthCard title="This link doesn't work" description="The password reset link is missing its security token.">
        <Button to="/forgot-password" size="lg" className="w-full">
          Request a new link
        </Button>
      </AuthCard>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("The two passwords don't match.")
      return
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.")
      return
    }

    setLoading(true)

    try {
      await authAPI.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate("/login"), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || "This reset link has expired or was already used. Request a new one.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthCard title="Password updated">
        <div className="flex flex-col items-center gap-4 text-center" role="status">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
          <p className="text-muted">You can now sign in with your new password. Taking you to sign in…</p>
          <Button to="/login" variant="outline">
            Sign in now
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a password you haven't used here before."
      footer={
        <Link to="/login" className="text-muted hover:text-foreground">
          Back to sign in
        </Link>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {error && (
          <p className="alert-danger" role="alert">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="password" className="form-label">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="mt-1.5 text-xs text-muted">
            At least 8 characters.
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="form-label">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input"
          />
        </div>

        <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
          {loading ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  )
}
