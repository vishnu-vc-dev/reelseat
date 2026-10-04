import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '../api';

/**
 * Session state. The JWT lives in an httpOnly cookie, so the client only
 * keeps the user profile; `status` tells route guards whether the initial
 * session check has finished.
 */

export const fetchCurrentUser = createAsyncThunk('auth/me', async () => {
  try {
    const res = await authApi.me();
    return res.data;
  } catch (err) {
    /** 401 simply means "not logged in" and is not an error for the UI. */
    if (err.status === 401) return null;
    throw err;
  }
});

export const login = createAsyncThunk('auth/login', async (credentials) => (await authApi.login(credentials)).data);

export const register = createAsyncThunk('auth/register', async (body) => (await authApi.register(body)).data);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authApi.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'idle' },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'ready';
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.status = 'ready';
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { setUser } = authSlice.actions;
export const selectUser = (state) => state.auth.user;
export const selectAuthReady = (state) => state.auth.status === 'ready';
export default authSlice.reducer;
