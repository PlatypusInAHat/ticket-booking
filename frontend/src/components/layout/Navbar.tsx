import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  Bell,
  ChevronDown,
  Gauge,
  Home as HomeIcon,
  LogOut,
  Search,
  ShoppingBag,
  Ticket,
  User,
  Webhook,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppSelector, useAppDispatch } from "@/store"
import { logout } from "@/store/authSlice"
import { authAPI } from "@/services/api"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/layout/Logo"

const browseLinks = [
  { label: "All events", to: "/events" },
  { label: "Concerts", to: "/events?category=Concert" },
  { label: "Festivals", to: "/events?category=Festival" },
  { label: "Sports", to: "/events?category=Sports" },
]

type MenuItem = { label: string; to: string; icon: typeof Ticket }

function accountItems(role?: string): MenuItem[] {
  const items: MenuItem[] = [
    { label: "My tickets", to: "/dashboard", icon: Ticket },
    { label: "Email preferences", to: "/account/notifications", icon: Bell },
  ]
  if (role === "admin" || role === "organizer") {
    items.push({ label: role === "admin" ? "Admin" : "Organizer tools", to: "/admin", icon: Gauge })
  }
  if (role === "admin") items.push({ label: "API status", to: "/api-management", icon: Webhook })
  return items
}

function useCartCount() {
  const items = useAppSelector((state: any) => state.cart.items || [])
  return items.reduce((total: number, item: any) => total + item.quantity, 0) || 0
}

/** The search slot: a short stub in the bar that sends the query to the events list. */
function NavSearch({ className, autoFocus, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const current = location.pathname === "/events" ? new URLSearchParams(location.search).get("q") ?? "" : ""
  const [query, setQuery] = useState(current)

  useEffect(() => setQuery(current), [current])

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(event) => {
        event.preventDefault()
        const q = query.trim()
        navigate(q ? `/events?q=${encodeURIComponent(q)}` : "/events")
        onDone?.()
      }}
    >
      <label htmlFor="nav-search" className="sr-only">
        Search events
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
      <input
        id="nav-search"
        type="search"
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search events, artists, cities"
        className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-2 focus:border-accent"
      />
    </form>
  )
}

function AccountMenu({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname, location.search])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-md border border-border pl-1 pr-2 transition-colors hover:border-border-strong"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent font-display text-base font-extrabold text-accent-foreground">
          {initial}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium lg:block">{user?.name || "Account"}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] w-64 overflow-hidden rounded-[var(--radius-card)] border border-border-strong bg-surface"
        >
          <div className="border-b border-dashed border-border-strong px-4 py-3">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <ul className="py-1.5">
            {accountItems(user?.role).map((item) => (
              <li key={item.to}>
                <Link
                  role="menuitem"
                  to={item.to}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            role="menuitem"
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

/** Bottom sheet for the mobile Account tab. */
function MobileAccountSheet({ user, onClose, onLogout }: { user: any; onClose: () => void; onLogout: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Account">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-background/80" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[var(--radius-3xl)] border-t border-border-strong bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          {user ? (
            <div className="min-w-0">
              <p className="type-print truncate text-3xl">{user.name}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
            </div>
          ) : (
            <p className="type-print text-3xl">Your account</p>
          )}
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted hover:bg-surface-2" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-t-2 border-dashed border-border-strong" />
        <nav className="flex flex-col px-2 py-2" aria-label="Account">
          {user ? (
            <>
              {accountItems(user.role).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-md px-3 py-3.5 text-base hover:bg-surface-2"
                >
                  <item.icon className="h-5 w-5 text-muted" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-3 rounded-md px-3 py-3.5 text-left text-base text-muted hover:bg-surface-2"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 p-3">
              <Button to="/login" onClick={onClose} className="w-full">
                Sign in
              </Button>
              <Button to="/register" variant="secondary" className="w-full">
                Create account
              </Button>
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user, token } = useAppSelector((state: any) => state.auth || {})
  const count = useCartCount()

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      // Client-side logout must still clear local credentials if the session is already expired.
    }
    dispatch(logout())
    setSheetOpen(false)
    navigate("/")
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setSearchOpen(false)
    setSheetOpen(false)
  }, [location.pathname, location.search])

  const browseActive = (to: string) => {
    const [path, query = ""] = to.split("?")
    if (location.pathname !== path) return false
    const category = new URLSearchParams(location.search).get("category")
    const wanted = new URLSearchParams(query).get("category")
    return (category || null) === (wanted || null)
  }

  const cartLink = (
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
  )

  const tab = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
      active ? "text-accent" : "text-muted",
    )

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 bg-background transition-colors duration-200",
          scrolled ? "border-b-2 border-dashed border-border-strong" : "border-b-2 border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="TicketStage home" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center lg:flex" aria-label="Browse">
            {browseLinks.map((item) => {
              const active = browseActive(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-16 items-center px-3 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-accent"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Home has its own search in the hero, so the bar keeps one search per screen. */}
          {location.pathname !== "/" && <NavSearch className="ml-auto hidden w-full max-w-xs md:block xl:max-w-sm" />}

          <div className={cn("ml-auto flex items-center gap-1.5", location.pathname !== "/" && "md:ml-0")}>
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground md:hidden"
              aria-label={searchOpen ? "Close search" : "Search events"}
              aria-expanded={searchOpen}
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            {cartLink}
            <div className="hidden md:block">
              {token && user ? (
                <AccountMenu user={user} onLogout={handleLogout} />
              ) : (
                <Button to="/login" size="sm">
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-border bg-background px-4 pb-3 pt-2 md:hidden">
            <NavSearch autoFocus onDone={() => setSearchOpen(false)} />
          </div>
        )}
      </header>

      {/* Mobile tab bar: the four places people go most, thumb-reachable. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 flex h-16 border-t-2 border-dashed border-border-strong bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <NavLink to="/" end className={({ isActive }) => tab(isActive)}>
          <HomeIcon className="h-5 w-5" aria-hidden="true" />
          Home
        </NavLink>
        <NavLink to="/events" className={({ isActive }) => tab(isActive)}>
          <Search className="h-5 w-5" aria-hidden="true" />
          Events
        </NavLink>
        <NavLink to={token ? "/dashboard" : "/login"} className={({ isActive }) => tab(isActive)}>
          <Ticket className="h-5 w-5" aria-hidden="true" />
          Tickets
        </NavLink>
        <button type="button" onClick={() => setSheetOpen(true)} className={tab(sheetOpen)} aria-haspopup="dialog">
          <User className="h-5 w-5" aria-hidden="true" />
          Account
        </button>
      </nav>

      {sheetOpen && <MobileAccountSheet user={token ? user : null} onClose={() => setSheetOpen(false)} onLogout={handleLogout} />}
    </>
  )
}
