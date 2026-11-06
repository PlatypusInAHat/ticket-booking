import { useState } from "react"
import { Link } from "react-router-dom"
import { MailCheck } from "lucide-react"
import { AuthCard } from "@/components/layout/AuthCard"
import { Button } from "@/components/ui/Button"
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
      setError(err.response?.data?.message || "We couldn't send the reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const backToSignIn = (
    <Link to="/login" className="text-muted hover:text-foreground">
      Back to sign in
    </Link>
  )

  if (success) {
    return (
      <AuthCard title="Check your inbox" footer={backToSignIn}>
        <div className="flex flex-col items-center gap-4 text-center" role="status">
          <MailCheck className="h-10 w-10 text-success" aria-hidden="true" />
          <p className="text-muted">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, we've sent a link to
            reset the password. It may take a minute to arrive.
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a reset link."
      footer={backToSignIn}
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {error && (
          <p className="alert-danger" role="alert">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="name@example.com"
          />
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  )
}
