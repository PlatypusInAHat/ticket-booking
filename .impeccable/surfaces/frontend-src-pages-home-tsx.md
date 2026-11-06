---
version: 1
slug: "frontend-src-pages-home-tsx"
primary_target: "frontend/src/pages/Home.tsx"
related_targets: ["frontend/src/pages/Events.tsx","frontend/src/pages/EventDetail.tsx","frontend/src/pages/Dashboard.tsx"]
---

# Surface brief: TicketStage customer web (Home lead, all customer routes inherit)

Scope: Home (Persuade) leads; Events, EventDetail, Cart, Checkout, PaymentResult, auth and Dashboard inherit the world as Operate surfaces. Admin keeps its denser layout, inheriting tokens and shapes only.
Audience: Vietnamese concert/festival goers on phones at night; action: find an event and buy a ticket. Constraints: dark ground and amber kept (user-pinned); no SaaS-template look, no cold tool feel; no invented numbers.

## Direction contract

THESIS: Every event is a printed ticket. The card is the ticket body, the price and date live on the stub past a perforation, and buying is tearing the stub. Refuses the dark-SaaS hero + search + rounded card grid + icon tiles.

OWN-WORLD: Warm near-black ground; tickets are cream card stock (ink-dark text) with die-cut notches and dashed perforations; amber is the foil-stamp print colour for prices, primary action and selection. Big Shoulders condensed caps for titles, dates and numbers; Be Vietnam Pro for text. 4px corners, no pills, no shadows, no glass: depth only by tickets overlapping. Statuses printed as stamp words (ON SALE, ALMOST GONE, SOLD OUT) in a thin ruled box.

STORY: Visitor sees this week's headline show as a real ticket, understands price/date instantly, searches or taps Buy, and later finds the same ticket shape holding their QR in Dashboard.

FIRST VIEWPORT: Full-width condensed headline (two lines) at top-left, search form directly beneath at full content width; the featured event as one large horizontal ticket spanning the container, photo body left, cream stub right with date numerals, venue, price-from and the amber Buy button; ticket overlaps the hero's bottom edge.

FORM: Ticket stub, candidate 1 of 7 (IMPECCABLE'S PICK, chosen over the assigned hand-painted signage). seed:9c773a4ed44899ad. Raises kept: statuses as printed words; depth by overlap only; card front continues into the detail header; hold/sale deadlines printed ahead.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
