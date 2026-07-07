import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
          theme?: "auto" | "light" | "dark"
        }
      ) => string
      reset: (widgetId?: string) => void
      remove?: (widgetId?: string) => void
    }
  }
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script"

const loadTurnstileScript = () => new Promise<void>((resolve, reject) => {
  if (window.turnstile) {
    resolve()
    return
  }

  const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    existing.addEventListener("load", () => resolve(), { once: true })
    existing.addEventListener("error", () => reject(new Error("Turnstile script failed to load")), { once: true })
    return
  }

  const script = document.createElement("script")
  script.id = TURNSTILE_SCRIPT_ID
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
  script.async = true
  script.defer = true
  script.onload = () => resolve()
  script.onerror = () => reject(new Error("Turnstile script failed to load"))
  document.head.appendChild(script)
})

type TurnstileWidgetProps = {
  siteKey?: string
  onVerify: (token: string) => void
  onReset?: () => void
}

export function TurnstileWidget({ siteKey, onVerify, onReset }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string>("")
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    if (!siteKey || !containerRef.current) {
      return undefined
    }

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) {
          return
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => {
            setError("")
            onVerify(token)
          },
          "expired-callback": () => {
            onReset?.()
          },
          "error-callback": () => {
            setError("Human verification could not load. Please refresh and try again.")
            onReset?.()
          },
        })
      })
      .catch(() => {
        setError("Human verification could not load. Please refresh and try again.")
        onReset?.()
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = ""
    }
  }, [siteKey, onVerify, onReset])

  if (!siteKey) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600">
        Bot challenge is disabled in this environment. Configure <code>VITE_TURNSTILE_SITE_KEY</code> for production checkout.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} />
      {error && (
        <p className="text-sm font-semibold text-red-500">{error}</p>
      )}
    </div>
  )
}
