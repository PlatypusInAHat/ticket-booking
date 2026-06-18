import { forwardRef } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost" | "outline"
type Size = "sm" | "md" | "lg"

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none"

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-strong hover:shadow-[0_8px_30px_-8px_var(--color-accent)] active:scale-[0.98]",
  secondary:
    "bg-elevated text-foreground hover:bg-border-strong active:scale-[0.98] border border-border",
  outline:
    "border border-border-strong text-foreground hover:border-accent hover:text-accent active:scale-[0.98]",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2 active:scale-[0.98]",
}

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  to?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", to, children, ...props }, ref) => {
    const classes = cn(base, variants[variant], sizes[size], className)
    if (to) {
      return (
        <Link to={to} className={classes}>
          {children}
        </Link>
      )
    }
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    )
  },
)
Button.displayName = "Button"
