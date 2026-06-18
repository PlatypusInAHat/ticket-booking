import { Link } from "react-router-dom"
import { Ticket, Instagram, Twitter, Youtube } from "lucide-react"

const cols = [
  {
    title: "Explore",
    links: [
      { label: "All Events", to: "/events" },
      { label: "Concerts", to: "/events?category=Concert" },
      { label: "Festivals", to: "/events?category=Festival" },
      { label: "Sports", to: "/events?category=Sports" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Press", to: "/" },
      { label: "Partners", to: "/" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/" },
      { label: "Refunds", to: "/" },
      { label: "Contact", to: "/" },
      { label: "Terms", to: "/" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Ticket className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">TicketStage</span>
            </Link>
            <p className="mt-4 max-w-sm text-pretty leading-relaxed text-muted">
              The premium way to discover and book tickets for the world&apos;s most
              unforgettable live experiences.
            </p>
            <div className="mt-5 flex gap-2">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold tracking-wide text-foreground">{col.title}</h4>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-2 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TicketStage. All rights reserved.</p>
          <p>Crafted for unforgettable nights.</p>
        </div>
      </div>
    </footer>
  )
}
