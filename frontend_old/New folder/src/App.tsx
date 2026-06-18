import { Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Home } from "@/pages/Home"
import { Events } from "@/pages/Events"
import { EventDetail } from "@/pages/EventDetail"
import { Cart } from "@/pages/Cart"

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:slug" element={<EventDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
