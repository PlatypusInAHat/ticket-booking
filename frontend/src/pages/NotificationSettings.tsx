import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { notificationsAPI } from "@/services/api"
import { useAppSelector } from "@/store"
import { cn } from "@/lib/utils"

type Preferences = {
  transactionalEnabled: boolean
  eventReminderEnabled: boolean
  marketingOptIn: boolean
  locale: "en" | "vi"
}

const defaults: Preferences = {
  transactionalEnabled: true,
  eventReminderEnabled: true,
  marketingOptIn: false,
  locale: "en",
}

const options: { key: keyof Omit<Preferences, "locale">; title: string; body: string; locked?: boolean }[] = [
  {
    key: "transactionalEnabled",
    title: "Orders and e-tickets",
    body: "Booking confirmations, payment receipts, cancellations and your e-tickets.",
  },
  {
    key: "eventReminderEnabled",
    title: "Event reminders",
    body: "A reminder before each event you have tickets for, with venue and gate details.",
  },
  {
    key: "marketingOptIn",
    title: "New events and presales",
    body: "Early-bird tickets and new shows from organizers on TicketStage. At most a few emails a month.",
  },
]

export function NotificationSettings() {
  const { user } = useAppSelector((state: any) => state.auth || {})
  const [prefs, setPrefs] = useState<Preferences>(defaults)
  const [saved, setSaved] = useState<Preferences>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null)

  useEffect(() => {
    notificationsAPI
      .getPreferences()
      .then((response: any) => {
        const data = response.data.data || {}
        const next: Preferences = {
          transactionalEnabled: data.transactionalEnabled ?? defaults.transactionalEnabled,
          eventReminderEnabled: data.eventReminderEnabled ?? defaults.eventReminderEnabled,
          marketingOptIn: data.marketingOptIn ?? defaults.marketingOptIn,
          locale: data.locale === "vi" ? "vi" : "en",
        }
        setPrefs(next)
        setSaved(next)
      })
      .catch(() => {
        // Older notification builds have no GET endpoint; start from the defaults and let saving create the record.
      })
      .finally(() => setLoading(false))
  }, [])

  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved)

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await notificationsAPI.updatePreferences(prefs)
      setSaved(prefs)
      setMessage({ tone: "success", text: "Email preferences saved." })
    } catch (err: any) {
      setMessage({ tone: "danger", text: err.response?.data?.message || "We couldn't save your preferences. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="type-print text-5xl sm:text-6xl">Email preferences</h1>
      <p className="mt-2 text-muted">
        Choose what we send to <span className="font-medium text-foreground">{user?.email}</span>.
      </p>

      <form onSubmit={save} className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        <fieldset disabled={loading || saving}>
          <legend className="sr-only">Email types</legend>
          <ul className="divide-y divide-dashed divide-border-strong">
            {options.map((option) => {
              const checked = prefs[option.key]
              return (
                <li key={option.key}>
                  <label className="flex cursor-pointer items-start gap-4 px-6 py-5 transition-colors hover:bg-surface-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(event) => setPrefs((current) => ({ ...current, [option.key]: event.target.checked }))}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                        checked ? "border-accent bg-accent" : "border-border-strong",
                      )}
                    >
                      {checked && <Check className="h-3 w-3 text-accent-foreground" />}
                    </span>
                    <span>
                      <span className="block font-semibold">{option.title}</span>
                      <span className="mt-0.5 block text-sm text-muted">{option.body}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-border px-6 py-5">
            <label htmlFor="email-locale" className="form-label">
              Email language
            </label>
            <select
              id="email-locale"
              value={prefs.locale}
              onChange={(event) => setPrefs((current) => ({ ...current, locale: event.target.value === "vi" ? "vi" : "en" }))}
              className="form-input sm:max-w-xs"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4 border-t border-border bg-surface-2 px-6 py-4">
          <Button type="submit" disabled={!dirty || saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Saving…" : "Save preferences"}
          </Button>
          {loading && <span className="text-sm text-muted">Loading your current settings…</span>}
          {message && (
            <p className={message.tone === "success" ? "text-sm text-success" : "text-sm text-danger"} role="status">
              {message.text}
            </p>
          )}
        </div>
      </form>

      <p className="mt-4 text-xs text-muted-2">
        Turning off order emails doesn't affect your tickets: they're always available under My tickets.
      </p>
    </div>
  )
}
