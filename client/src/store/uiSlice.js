import { createSlice } from '@reduxjs/toolkit';

const CITY_KEY = 'reelseat.city';

/** localStorage can throw in private mode; the app must still work without it. */
function readCity() {
  try {
    return localStorage.getItem(CITY_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Cross-page UI preferences. The selected city filters showtimes the same
 * way ticketing apps scope everything to a location.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState: { city: readCity() },
  reducers: {
    setCity(state, action) {
      state.city = action.payload;
      try {
        localStorage.setItem(CITY_KEY, action.payload);
      } catch {
        /** Persisting is a convenience only. */
      }
    },
  },
});

export const { setCity } = uiSlice.actions;
export const selectCity = (state) => state.ui.city;
export default uiSlice.reducer;
