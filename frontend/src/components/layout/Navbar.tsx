import { useState, useEffect } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { Ticket, ShoppingBag, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppSelector, useAppDispatch } from "@/store"
import { logout } from "@/store/authSlice"
import { authAPI } from "@/services/api"
const navItems = [
  { label: "Home", to: "/" },
  { label: "Events", to: "/events" },
  { label: "Festivals", to: "/events?category=Festival" },
  { label: "Sports", to: "/events?category=Sports" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { user, token } = useAppSelector((state: any) => state.auth || {})
  const items = useAppSelector((state: any) => state.cart.items || [])
  const count = items.reduce((total: number, item: any) => total + item.quantity, 0) || 0
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      // Client-side logout must still clear local credentials if the session is already expired.
    }
    dispatch(logout())
    setOpen(false)
    navigate("/")
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "glass border-b border-border" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Ticket className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">TicketStage</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive && item.to.indexOf("?") === -1
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          {user && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
                )
              }
            >
              Dashboard
            </NavLink>
          )}
          {user?.role === "admin" && (
            <>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
                  )
                }
              >
                Admin
              </NavLink>
              <NavLink
                to="/api-management"
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
                  )
                }
              >
                API
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            aria-label={`Cart with ${count} items`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
          
          {token ? (
            <button
              onClick={handleLogout}
              className="hidden rounded-full bg-surface-2 px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-3 sm:inline-flex"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong sm:inline-flex"
            >
              Sign In
            </Link>
          )}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="glass border-t border-border md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive && item.to.indexOf("?") === -1
                      ? "bg-surface-2 text-foreground"
                      : "text-muted hover:bg-surface-2 hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  cn(
                    "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  )
                }
              >
                Dashboard
              </NavLink>
            )}
            {user?.role === "admin" && (
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn(
                      "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
                    )
                  }
                >
                  Admin
                </NavLink>
                <NavLink
                  to="/api-management"
                  className={({ isActive }) =>
                    cn(
                      "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
                    )
                  }
                >
                  API
                </NavLink>
              </>
            )}
            <div className="my-2 h-px bg-border" />
            {token ? (
              <button
                onClick={handleLogout}
                className="rounded-xl bg-surface-2 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-3"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-accent px-4 py-3 text-center text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong"
                onClick={() => setOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
