import { createSlice } from '@reduxjs/toolkit';

const storageKeys = {
  token: 'token',
  user: 'auth_user'
};

const loadUser = () => {
  try {
    const rawUser = localStorage.getItem(storageKeys.user);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    localStorage.removeItem(storageKeys.user);
    return null;
  }
};

const persistAuth = (user, token) => {
  if (token) {
    localStorage.setItem(storageKeys.token, token);
  } else {
    localStorage.removeItem(storageKeys.token);
  }

  if (user) {
    localStorage.setItem(storageKeys.user, JSON.stringify(user));
  } else {
    localStorage.removeItem(storageKeys.user);
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: loadUser(),
    token: localStorage.getItem(storageKeys.token) || null,
    isLoading: false,
    error: null
  },
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoading = false;
      persistAuth(action.payload.user, action.payload.token);
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      persistAuth(null, null);
    },
    registerSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoading = false;
      persistAuth(action.payload.user, action.payload.token);
    },
    updateProfileSuccess: (state, action) => {
      state.user = {
        ...state.user,
        ...action.payload
      };
      persistAuth(state.user, state.token);
    },
    clearAuthError: (state) => {
      state.error = null;
    }
  }
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  registerSuccess,
  updateProfileSuccess,
  clearAuthError
} = authSlice.actions;
export default authSlice.reducer;
