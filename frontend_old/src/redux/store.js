import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import eventReducer from './slices/eventSlice';
import cartReducer from './slices/cartSlice';

export default configureStore({
  reducer: {
    auth: authReducer,
    events: eventReducer,
    cart: cartReducer
  }
});
