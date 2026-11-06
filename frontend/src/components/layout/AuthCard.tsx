import { Link } from "react-router-dom"
import { Logo } from "@/components/layout/Logo"
import { Perforation } from "@/components/ui/Perforation"

// Shared frame for sign-in, registration and password recovery.
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          <div className="px-6 pb-6 pt-6 sm:px-8">
            <Link to="/" aria-label="TicketStage home" className="inline-block">
              <Logo showName={false} />
            </Link>
            <h1 className="type-print mt-5 text-5xl">{title}</h1>
            {description && <p className="mt-2 max-w-sm text-pretty text-muted">{description}</p>}
          </div>
          <Perforation />
          <div className="px-6 pb-8 pt-7 sm:px-8">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  )
}
