import { useEffect, useRef } from "react"
import { Perforation } from "@/components/ui/Perforation"
import { Button } from "@/components/ui/Button"

export type QueueState = {
  position: number
  estimatedWaitSeconds: number
  /** Position when the visitor joined; drives the progress strip. */
  startPosition: number
}

const formatWait = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Any moment now"
  const minutes = Math.ceil(seconds / 60)
  return minutes <= 1 ? "About a minute" : `About ${minutes} minutes`
}

/**
 * Full-screen queue ticket shown while checkout waits for admission.
 * The number counts down like a deli ticket; the strip of stub segments fills as the line moves.
 */
export function WaitingRoom({ queue, onLeave }: { queue: QueueState; onLeave: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const segments = 24
  const progress = queue.startPosition > 0 ? 1 - Math.max(queue.position - 1, 0) / queue.startPosition : 0
  const filled = Math.round(Math.min(Math.max(progress, 0), 1) * segments)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-background px-4 py-10" role="dialog" aria-modal="true" aria-labelledby="queue-title">
      <div className="w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-border-strong bg-surface">
        <div className="px-6 pb-7 pt-8 sm:px-8">
          <h1 id="queue-title" ref={headingRef} tabIndex={-1} className="type-print text-4xl outline-none sm:text-5xl">
            You're in the queue
          </h1>
          <p className="mt-2 text-pretty text-muted">
            Lots of people are buying right now. Keep this tab open: checkout continues on its own when it's your turn.
          </p>

          <div className="mt-8 flex items-end justify-between gap-6" aria-live="polite">
            <div>
              <p className="text-xs font-medium text-muted-2">Your number</p>
              <p className="type-print mt-3 text-[clamp(4.5rem,18vw,7rem)] leading-[0.82] tabular-nums text-accent">
                {queue.position.toLocaleString("en-US")}
              </p>
            </div>
            <div className="pb-1 text-right">
              <p className="text-xs font-medium text-muted-2">Estimated wait</p>
              <p className="font-display text-2xl font-extrabold leading-tight">{formatWait(queue.estimatedWaitSeconds)}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-1" aria-hidden="true">
            {Array.from({ length: segments }).map((_, index) => (
              <span
                key={index}
                className={
                  "h-2 flex-1 rounded-[1px] transition-colors duration-700 " + (index < filled ? "bg-accent" : "bg-surface-3")
                }
              />
            ))}
          </div>
        </div>

        <Perforation groundClassName="bg-background" />

        <div className="paper flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-8">
          <p className="max-w-xs text-sm text-paper-muted">Your cart is saved. Leaving the queue gives up your place.</p>
          <Button variant="secondary" onClick={onLeave}>
            Leave queue
          </Button>
        </div>
      </div>
    </div>
  )
}
