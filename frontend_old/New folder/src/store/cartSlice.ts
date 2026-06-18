import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface CartLine {
  eventId: string
  eventTitle: string
  eventImage: string
  eventDate: string
  venue: string
  tierId: string
  tierName: string
  price: number
  quantity: number
}

interface CartState {
  lines: CartLine[]
}

const initialState: CartState = {
  lines: [],
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<CartLine>) {
      const existing = state.lines.find(
        (l) => l.eventId === action.payload.eventId && l.tierId === action.payload.tierId,
      )
      if (existing) {
        existing.quantity += action.payload.quantity
      } else {
        state.lines.push(action.payload)
      }
    },
    updateQuantity(state, action: PayloadAction<{ eventId: string; tierId: string; quantity: number }>) {
      const line = state.lines.find(
        (l) => l.eventId === action.payload.eventId && l.tierId === action.payload.tierId,
      )
      if (line) {
        line.quantity = Math.max(1, action.payload.quantity)
      }
    },
    removeFromCart(state, action: PayloadAction<{ eventId: string; tierId: string }>) {
      state.lines = state.lines.filter(
        (l) => !(l.eventId === action.payload.eventId && l.tierId === action.payload.tierId),
      )
    },
    clearCart(state) {
      state.lines = []
    },
  },
})

export const { addToCart, updateQuantity, removeFromCart, clearCart } = cartSlice.actions
export default cartSlice.reducer
