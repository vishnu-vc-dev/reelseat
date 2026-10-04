import { lazy, Suspense, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import PageLoader from './components/PageLoader';
import ProtectedRoute from './components/ProtectedRoute';
import { fetchCurrentUser } from './store/authSlice';

/**
 * Pages are lazy-loaded so customers never download the admin and partner
 * dashboards (and their chart library) unless they need them.
 */
const Home = lazy(() => import('./pages/Home'));
const MovieDetails = lazy(() => import('./pages/MovieDetails'));
const SeatSelection = lazy(() => import('./pages/SeatSelection'));
const BookingDetails = lazy(() => import('./pages/BookingDetails'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Profile = lazy(() => import('./pages/Profile'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const PartnerDashboard = lazy(() => import('./pages/partner/PartnerDashboard'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  const dispatch = useDispatch();

  /** Restore the session from the httpOnly cookie on first load. */
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="movies/:id" element={<MovieDetails />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="shows/:id" element={<SeatSelection />} />

          <Route element={<ProtectedRoute />}>
            <Route path="bookings" element={<MyBookings />} />
            <Route path="bookings/:id" element={<BookingDetails />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route element={<ProtectedRoute roles={['partner', 'admin']} />}>
            <Route path="partner" element={<PartnerDashboard />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
