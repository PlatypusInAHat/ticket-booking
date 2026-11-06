import { useState, useEffect } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { ShoppingBag, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppSelector, useAppDispatch } from "@/store"
import { logout } from "@/store/authSlice"
import { authAPI } from "@/services/api"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/layout/Logo"

const navItems = [
  { label: "Home", to: "/" },
  { label: "Events", to: "/events" },
  { label: "Festivals", to: "/events?category=Festival" },
  { label: "Sports", to: "/events?category=Sports" },
]

// Query-string links never show as active: /events?category=X would otherwise light up with /events.
const desktopLink = (active: boolean) =>
  cn(
    "relative flex h-16 items-center px-3 text-sm font-medium transition-colors",
    active
      ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-accent"
      : "text-muted hover:text-foreground",
  )

const mobileLink = (active: boolean) =>
  cn(
    "border-b border-border py-3.5 type-print text-3xl transition-colors",
    active ? "text-accent" : "text-foreground hover:text-accent",
  )

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { user, token } = useAppSelector((state: any) => state.auth || {})
  const items = useAppSelector((state: any) => state.cart.items || [])
  const count = items.reduce((total: number, item: any) => total + item.quantity, 0) || 0
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const links = [
    ...navItems,
    ...(user ? [{ label: "My tickets", to: "/dashboard" }] : []),
    ...(user?.role === "admin"
      ? [
          { label: "Admin", to: "/admin" },
          { label: "API", to: "/api-management" },
        ]
      : []),
  ]

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
        "fixed inset-x-0 top-0 z-50 border-b bg-background transition-colors duration-200",
        scrolled || open ? "border-border" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="TicketStage home">
          <Logo />
        </Link>

        <nav className="hidden items-center md:flex" aria-label="Main">
          {links.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => desktopLink(isActive && !item.to.includes("?"))}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            to="/cart"
            className="relative flex h-10 items-center gap-2 rounded-md px-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            aria-label={count === 1 ? "Cart, 1 ticket" : `Cart, ${count} tickets`}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-accent px-1 text-xs font-bold tabular-nums text-accent-foreground">
                {count}
              </span>
            )}
          </Link>

          {token ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:inline-flex">
              Sign out
            </Button>
          ) : (
            <Button to="/login" size="sm" className="hidden sm:inline-flex">
              Sign in
            </Button>
          )}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 pb-6 pt-2" aria-label="Main">
            {links.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => mobileLink(isActive && !item.to.includes("?"))}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-6">
              {token ? (
                <Button variant="secondary" className="w-full" onClick={handleLogout}>
                  Sign out
                </Button>
              ) : (
                <Button to="/login" className="w-full">
                  Sign in
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
