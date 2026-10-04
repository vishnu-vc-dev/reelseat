import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectAuthReady, selectUser } from '../store/authSlice';
import PageLoader from './PageLoader';

/**
 * Route guard. Waits for the initial session check, then:
 *  - redirects anonymous users to /login (remembering where they were going)
 *  - shows a 403-style redirect home when the role is not allowed
 * Server-side `authorize()` remains the real enforcement; this only improves UX.
 *
 * @param {{ roles?: ('user'|'partner'|'admin')[] }} props
 */
export default function ProtectedRoute({ roles }) {
  const user = useSelector(selectUser);
  const ready = useSelector(selectAuthReady);
  const location = useLocation();

  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
