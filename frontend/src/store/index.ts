import { configureStore } from "@reduxjs/toolkit"
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux"
import cartReducer from "./cartSlice"
import authReducer from "./authSlice"
import eventReducer from "./eventSlice"

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    auth: authReducer,
    event: eventReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
