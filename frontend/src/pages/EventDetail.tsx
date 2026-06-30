import { useEffect, useMemo, useState } from "react"
import { useParams, Link } from "react-router-dom"
import {
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  MapPin,
  ShoppingBag,
  Star,
  Users,
} from "lucide-react"
import type { EventItem } from "@/data/types"
import { StatusBadge, Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { SectionTitle } from "@/components/ui/SectionTitle"
import { TicketTierCard } from "@/components/TicketTierCard"
import { EventCard } from "@/components/EventCard"
import { formatCurrency, formatDate, formatTime } from "@/lib/utils"
import { useAppDispatch } from "@/store"
import { addToCart } from "@/store/cartSlice"
import { eventsAPI, ticketsAPI } from "@/services/api"
import { mapApiEventToEventItem } from "@/utils/eventMapper"

export function EventDetail() {
  const { slug } = useParams<{ slug: string }>()
  const dispatch = useAppDispatch()

  const [event, setEvent] = useState<EventItem | null>(null)
  const [related, setRelated] = useState<EventItem[]>([])
  const [selectedTier, setSelectedTier] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    const loadEvent = async () => {
      if (!slug) {
        setError("Không tìm thấy mã sự kiện.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError("")

      try {
        const eventResponse = await eventsAPI.getEventById(slug, { signal: controller.signal })
        const apiEvent = eventResponse.data.data
        const ticketsResponse = await ticketsAPI.getAll(
          { eventId: apiEvent.id || apiEvent._id, limit: 100 },
          { signal: controller.signal },
        )
        const apiTickets = ticketsResponse.data.data?.tickets || []
        const mappedEvent = mapApiEventToEventItem(apiEvent, apiTickets)
        setEvent(mappedEvent)
        setSelectedTier(mappedEvent.tiers[0]?.id || "")

        const relatedResponse = await eventsAPI.getEvents(
          { eventType: apiEvent.eventType, limit: 4 },
          { signal: controller.signal },
        )
        const relatedEvents = (relatedResponse.data.data?.events || [])
          .filter((item: any) => String(item.id || item._id) !== String(mappedEvent.id))
          .slice(0, 3)
          .map((item: any) => mapApiEventToEventItem(item))
        setRelated(relatedEvents)
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return
        setError(err.response?.data?.message || "Không thể tải chi tiết sự kiện.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadEvent()
    return () => controller.abort()
  }, [slug])

  const soldOut = event?.status === "soldout"
  const tier = useMemo(
    () => event?.tiers.find((item) => item.id === selectedTier) || event?.tiers[0],
    [event, selectedTier],
  )
  const effectiveQuantity = quantity
  const total = (tier?.price ?? 0) * effectiveQuantity

  const handleAdd = () => {
    if (!event || !tier || soldOut || effectiveQuantity === 0) return
    dispatch(
      addToCart({
        _id: tier.id,
        ticketId: tier.id,
        eventId: event.id,
        eventName: event.title,
        eventTitle: event.title,
        eventImage: event.image,
        eventDate: event.date,
        venue: `${event.venue}, ${event.city}`,
        tierId: tier.id,
        tierName: tier.name,
        category: tier.name,
        price: tier.price,
        availableSeats: tier.remaining || 1,
        quantity: effectiveQuantity,
      }),
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="h-[520px] animate-pulse rounded-[var(--radius-card)] border border-border bg-surface" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-32 text-center">
        <h1 className="font-display text-2xl font-bold">Không tìm thấy sự kiện</h1>
        <p className="text-muted">{error || "Sự kiện này không tồn tại hoặc đã ngừng bán."}</p>
        <Button to="/events">Xem tất cả sự kiện</Button>
      </div>
    )
  }

  return (
    <>
      <section className="relative">
        <div className="absolute inset-0 h-full">
          <img src={event.heroImage || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại danh sách
          </Link>

          <div className="mt-28 flex flex-wrap items-center gap-2 sm:mt-40">
            <Badge tone="neutral" className="bg-background/70">
              {event.category}
            </Badge>
            {event.popular && <Badge tone="accent">Nổi bật</Badge>}
            <StatusBadge status={event.status} />
          </div>

          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            {event.title}
          </h1>
          <p className="mt-3 text-lg text-muted">{event.artist}</p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <span className="flex items-center gap-2 text-muted">
              <Calendar className="h-4 w-4 text-accent" />
              {formatDate(event.date, { weekday: "long" })}
            </span>
            <span className="flex items-center gap-2 text-muted">
              <Clock className="h-4 w-4 text-accent" />
              Mở cửa {formatTime(event.doorsTime)} · Diễn ra {formatTime(event.date)}
            </span>
            <span className="flex items-center gap-2 text-muted">
              <MapPin className="h-4 w-4 text-accent" />
              {event.venue}, {event.city}
            </span>
            <span className="flex items-center gap-2 text-muted">
              <Star className="h-4 w-4 fill-accent text-accent" />
              {event.rating} đánh giá
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-10">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Thông tin sự kiện</h2>
              <p className="mt-4 leading-relaxed text-pretty text-muted">{event.description}</p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Ban tổ chức</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {event.lineup.map((act) => (
                  <span
                    key={act}
                    className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm"
                  >
                    <Users className="h-4 w-4 text-accent" />
                    {act}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Chọn loại vé</h2>
              <p className="mt-2 text-sm text-muted">
                Mỗi vé sau khi thanh toán sẽ có QR/barcode riêng để check-in.
              </p>
              {event.tiers.length > 0 ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {event.tiers.map((item) => (
                    <TicketTierCard
                      key={item.id}
                      tier={item}
                      selected={selectedTier === item.id}
                      quantity={quantity}
                      soldOut={soldOut || item.remaining <= 0}
                      onSelect={() => {
                        setSelectedTier(item.id)
                        setQuantity(1)
                      }}
                      onQuantity={setQuantity}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-border bg-surface p-8 text-center text-muted">
                  Sự kiện này chưa mở bán vé.
                </div>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-2">Giá từ</span>
                <StatusBadge status={event.status} />
              </div>
              <p className="mt-1 font-display text-3xl font-bold">
                {formatCurrency(event.priceFrom)}
              </p>

              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Đã chọn</span>
                  <span className="font-medium">{tier?.name ?? "Chưa có vé"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Số lượng</span>
                  <span className="font-medium">{tier ? effectiveQuantity : 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Giá mỗi vé</span>
                  <span className="font-medium">{formatCurrency(tier?.price ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                  <span className="font-semibold">Tổng</span>
                  <span className="font-display text-xl font-bold text-accent">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Button
                className="mt-5 w-full"
                size="lg"
                onClick={handleAdd}
                disabled={soldOut || !tier || tier.remaining <= 0}
              >
                {soldOut || !tier || tier.remaining <= 0 ? (
                  "Hết vé"
                ) : added ? (
                  <>
                    <Check className="h-4 w-4" />
                    Đã thêm vào giỏ
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    Thêm vào giỏ
                  </>
                )}
              </Button>
              {!soldOut && tier && (
                <Button to="/cart" variant="ghost" size="sm" className="mt-2 w-full">
                  Đi tới thanh toán →
                </Button>
              )}
              <p className="mt-4 text-center text-xs text-muted-2">
                Thanh toán bảo mật · Vé điện tử tức thì
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mt-20">
            <SectionTitle eyebrow="Có thể bạn quan tâm" title="Sự kiện tương tự" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <EventCard key={item.id} event={item} />
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  )
}
