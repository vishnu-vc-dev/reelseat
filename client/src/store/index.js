import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';

/**
 * Global store. Only truly global state (session, city) lives here;
 * page data is fetched locally by each page to keep caching concerns simple.
 */
const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

export default store;
