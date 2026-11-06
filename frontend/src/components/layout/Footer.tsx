import { Link } from "react-router-dom"
import { Logo } from "@/components/layout/Logo"

const cols = [
  {
    title: "Explore",
    links: [
      { label: "All events", to: "/events" },
      { label: "Concerts", to: "/events?category=Concert" },
      { label: "Festivals", to: "/events?category=Festival" },
      { label: "Sports", to: "/events?category=Sports" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/register" },
      { label: "My tickets", to: "/dashboard" },
      { label: "Cart", to: "/cart" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t-2 border-dashed border-border-strong bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Link to="/" aria-label="TicketStage home">
              <Logo />
            </Link>
            <p className="mt-4 max-w-sm text-pretty leading-relaxed text-muted">
              Event tickets from organizers across Vietnam, paid with VNPay or MoMo and delivered as e-tickets
              you scan at the gate.
            </p>
          </div>

          {cols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="type-print text-xl text-foreground">{col.title}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-muted transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted-2">
          <p>&copy; {new Date().getFullYear()} TicketStage</p>
        </div>
      </div>
    </footer>
  )
}
