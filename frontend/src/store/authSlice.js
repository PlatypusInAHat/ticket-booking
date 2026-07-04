import { createSlice } from '@reduxjs/toolkit';

const storageKeys = {
  token: 'token',
  refreshToken: 'refreshToken',
  user: 'auth_user',
  expiresAt: 'auth_expires_at',
  refreshExpiresAt: 'auth_refresh_expires_at'
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

const persistAuth = (user, token, refreshToken, expiresAt, refreshExpiresAt) => {
  if (token) {
    localStorage.setItem(storageKeys.token, token);
  } else {
    localStorage.removeItem(storageKeys.token);
  }

  if (refreshToken) {
    localStorage.setItem(storageKeys.refreshToken, refreshToken);
  } else {
    localStorage.removeItem(storageKeys.refreshToken);
  }

  if (user) {
    localStorage.setItem(storageKeys.user, JSON.stringify(user));
  } else {
    localStorage.removeItem(storageKeys.user);
  }

  if (expiresAt) {
    localStorage.setItem(storageKeys.expiresAt, expiresAt);
  } else {
    localStorage.removeItem(storageKeys.expiresAt);
  }

  if (refreshExpiresAt) {
    localStorage.setItem(storageKeys.refreshExpiresAt, refreshExpiresAt);
  } else {
    localStorage.removeItem(storageKeys.refreshExpiresAt);
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: loadUser(),
    token: localStorage.getItem(storageKeys.token) || null,
    refreshToken: localStorage.getItem(storageKeys.refreshToken) || null,
    expiresAt: localStorage.getItem(storageKeys.expiresAt) || null,
    refreshExpiresAt: localStorage.getItem(storageKeys.refreshExpiresAt) || null,
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
      state.refreshToken = action.payload.refreshToken;
      state.expiresAt = action.payload.expiresAt || null;
      state.refreshExpiresAt = action.payload.refreshExpiresAt || null;
      state.isLoading = false;
      persistAuth(action.payload.user, action.payload.token, action.payload.refreshToken, state.expiresAt, state.refreshExpiresAt);
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.refreshExpiresAt = null;
      state.error = null;
      persistAuth(null, null, null, null, null);
    },
    registerSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.expiresAt = action.payload.expiresAt || null;
      state.refreshExpiresAt = action.payload.refreshExpiresAt || null;
      state.isLoading = false;
      persistAuth(action.payload.user, action.payload.token, action.payload.refreshToken, state.expiresAt, state.refreshExpiresAt);
    },
    updateProfileSuccess: (state, action) => {
      state.user = {
        ...state.user,
        ...action.payload
      };
      persistAuth(state.user, state.token, state.refreshToken, state.expiresAt, state.refreshExpiresAt);
    },
    refreshSuccess: (state, action) => {
      state.user = action.payload.user || state.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.expiresAt = action.payload.expiresAt || null;
      state.refreshExpiresAt = action.payload.refreshExpiresAt || null;
      persistAuth(state.user, state.token, state.refreshToken, state.expiresAt, state.refreshExpiresAt);
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
  refreshSuccess,
  clearAuthError
} = authSlice.actions;
export default authSlice.reducer;
