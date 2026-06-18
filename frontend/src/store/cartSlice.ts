import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface CartItem {
  _id: string
  eventName: string
  price: number
  quantity: number
  availableSeats: number
  [key: string]: any
}

interface CartState {
  items: CartItem[]
  totalPrice: number
}

const initialCartState = (): CartState => {
  try {
    const rawItems = localStorage.getItem("cart_items")
    const items = rawItems ? JSON.parse(rawItems) : []
    const totalPrice = items.reduce((total: number, item: CartItem) => total + item.price * item.quantity, 0)

    return {
      items,
      totalPrice,
    }
  } catch (error) {
    localStorage.removeItem("cart_items")
    return {
      items: [],
      totalPrice: 0,
    }
  }
}

const persistCart = (items: CartItem[]) => {
  localStorage.setItem("cart_items", JSON.stringify(items))
}

const recalculateTotal = (state: CartState) => {
  state.totalPrice = state.items.reduce((total, item) => total + item.price * item.quantity, 0)
  persistCart(state.items)
}

const cartSlice = createSlice({
  name: "cart",
  initialState: initialCartState(),
  reducers: {
    addToCart: (state, action: PayloadAction<any>) => {
      const existingItem = state.items.find((item) => item._id === action.payload._id)
      const quantityToAdd = Math.max(1, Number(action.payload.quantity) || 1)

      if (existingItem) {
        existingItem.quantity = Math.min(
          existingItem.quantity + quantityToAdd,
          existingItem.availableSeats
        )
      } else {
        state.items.push({
          ...action.payload,
          quantity: Math.min(quantityToAdd, action.payload.availableSeats),
        })
      }

      recalculateTotal(state)
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item._id !== action.payload)
      recalculateTotal(state)
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find((item) => item._id === action.payload.id)
      if (item) {
        item.quantity = Math.min(Math.max(1, action.payload.quantity), item.availableSeats)
        if (item.quantity <= 0) {
          state.items = state.items.filter((i) => i._id !== action.payload.id)
        }
      }

      recalculateTotal(state)
    },
    clearCart: (state) => {
      state.items = []
      state.totalPrice = 0
      persistCart([])
    },
  },
})

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions

export default cartSlice.reducer
