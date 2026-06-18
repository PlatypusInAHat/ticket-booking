import { createSlice } from '@reduxjs/toolkit';

const eventSlice = createSlice({
  name: 'events',
  initialState: {
    events: [],
    selectedEvent: null,
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 0
    }
  },
  reducers: {
    fetchEventsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchEventsSuccess: (state, action) => {
      state.events = action.payload?.events || [];
      state.pagination = action.payload?.pagination || state.pagination;
      state.isLoading = false;
    },
    fetchEventsFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    selectEvent: (state, action) => {
      state.selectedEvent = action.payload;
    },
    clearSelectedEvent: (state) => {
      state.selectedEvent = null;
    }
  }
});

export const {
  fetchEventsStart,
  fetchEventsSuccess,
  fetchEventsFailure,
  selectEvent,
  clearSelectedEvent
} = eventSlice.actions;

export default eventSlice.reducer;
