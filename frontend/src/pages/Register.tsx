import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { UserPlus } from "lucide-react"
import { AuthCard } from "@/components/layout/AuthCard"
import { Button } from "@/components/ui/Button"
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
      setError("The two passwords don't match.")
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
          expiresAt: authData.expiresAt,
          refreshExpiresAt: authData.refreshExpiresAt,
        })
      )

      navigate("/")
    } catch (err: any) {
      setError(err.response?.data?.message || "We couldn't create your account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Book faster and keep every e-ticket in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-accent hover:text-accent-strong">
            Sign in
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
          <label htmlFor="register-name" className="form-label">
            Full name
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div>
          <label htmlFor="register-email" className="form-label">
            Email
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="form-label">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            aria-describedby="register-password-hint"
            required
          />
          <p id="register-password-hint" className="mt-1.5 text-xs text-muted">
            At least 8 characters.
          </p>
        </div>

        <div>
          <label htmlFor="register-confirm" className="form-label">
            Confirm password
          </label>
          <input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  )
}
