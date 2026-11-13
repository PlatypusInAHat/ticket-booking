import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Perforation } from "@/components/ui/Perforation"
import { notificationsAPI } from "@/services/api"

type State = "working" | "done" | "error"

// Landing page for the unsubscribe link in marketing emails (?email=&token=).
export function Unsubscribe() {
  const [params] = useSearchParams()
  const email = params.get("email") || ""
  const token = params.get("token") || ""
  const [state, setState] = useState<State>(email ? "working" : "error")
  const [error, setError] = useState(email ? "" : "This unsubscribe link is missing its email address.")
  const started = useRef(false)

  useEffect(() => {
    // Guard against StrictMode's double effect so the request runs once.
    if (!email || started.current) return
    started.current = true
    notificationsAPI
      .unsubscribe(email, token)
      .then(() => setState("done"))
      .catch((err: any) => {
        setState("error")
        setError(err.response?.data?.message || "We couldn't process this link. It may have expired.")
      })
  }, [email, token])

  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:py-28">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        <div className="px-6 pb-7 pt-8 sm:px-8" aria-live="polite">
          {state === "working" && (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
              <h1 className="type-print mt-4 text-4xl">Unsubscribing…</h1>
            </>
          )}
          {state === "done" && (
            <>
              <h1 className="type-print text-5xl">You're unsubscribed</h1>
              <p className="mt-3 text-pretty text-muted">
                <span className="font-medium text-foreground">{email}</span> won't get new-event and presale emails any more.
                Order confirmations and e-tickets still arrive as usual.
              </p>
            </>
          )}
          {state === "error" && (
            <>
              <h1 className="type-print text-5xl">Link didn't work</h1>
              <p className="mt-3 text-pretty text-muted">{error}</p>
            </>
          )}
        </div>
        <Perforation />
        <div className="paper flex flex-wrap items-center gap-3 px-6 py-5 sm:px-8">
          <Button to="/account/notifications">Manage email preferences</Button>
          <Link to="/" className="text-sm font-medium underline underline-offset-4 hover:text-foil">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
