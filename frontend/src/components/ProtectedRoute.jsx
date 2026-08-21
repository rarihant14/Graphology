/**
 * ProtectedRoute.jsx — Guards routes that require authentication.
 *
 * Three states:
 *  1. isLoading  → show centered spinner while auth state resolves
 *  2. !isAuthenticated → redirect to /login
 *  3. isAuthenticated  → render child routes via <Outlet />
 */

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // -------------------------------------------------------------------------
  // State 1 — Auth still resolving (checking token / fetching user)
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-violet-500 animate-spin" />
          <p className="text-gray-400 text-sm tracking-wide">
            Verifying your session...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // State 2 — Not authenticated → redirect to login
  // -------------------------------------------------------------------------

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // -------------------------------------------------------------------------
  // State 3 — Authenticated → render child route
  // -------------------------------------------------------------------------

  return <Outlet />;
};

export default ProtectedRoute;
