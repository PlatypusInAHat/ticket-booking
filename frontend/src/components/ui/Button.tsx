import { forwardRef } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost" | "outline"
type Size = "sm" | "md" | "lg"

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none active:translate-y-px"

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-strong",
  secondary: "bg-surface-2 text-foreground border border-border hover:bg-surface-3",
  outline: "border border-border-strong text-foreground hover:border-foreground",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2",
}

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
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
