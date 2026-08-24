/**
 * App.jsx — Root routing component for Graphology AI Agent.
 *
 * Structure:
 *  - AuthProvider wraps everything for global auth state
 *  - Toaster for global toast notifications
 *  - BrowserRouter with protected and public routes
 *
 * Routes:
 *  /            → LandingPage (public marketing page)
 *  /login       → LoginPage (public)
 *  /appointment → AppointmentPage (public)
 *  /home        → ProtectedRoute → HomePage
 *  /history     → ProtectedRoute → HistoryPage
 *  *            → redirect to /
 */

/**
 * App.jsx — Root routing component for Graphology AI Agent.
 *
 * Structure:
 *  - AuthProvider wraps everything for global auth state
 *  - Toaster for global toast notifications
 *  - BrowserRouter with protected and public routes
 *
 * Routes:
 *  /            → LandingPage (public marketing page)
 *  /login       → LoginPage (public)
 *  /appointment → AppointmentPage (public)
 *  /home        → ProtectedRoute → HomePage
 *  /history     → ProtectedRoute → HistoryPage
 *  *            → redirect to /
 */

import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Existing pages
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";

// New pages from Lovable
import LandingPage from "./pages/LandingPage";
import AppointmentPage from "./pages/AppointmentPage";

// ---------------------------------------------------------------------------
// handleAnalysisClick — auth-aware CTA redirect
// Used by LandingPage, passed down to Hero, HowItWorks, CtaBanner
// ---------------------------------------------------------------------------

export const handleAnalysisClick = () => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    window.location.hash = "#/home";
  } else {
    window.location.hash = "#/login";
  }
};

// ---------------------------------------------------------------------------
// AppRoutes — all routes in one place
// ---------------------------------------------------------------------------

const AppRoutes = () => (
  <Routes>
    {/* Public landing page — root */}
    <Route path="/" element={<LandingPage />} />

    {/* Public pages */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/appointment" element={<AppointmentPage />} />

    {/* Protected routes */}
    <Route element={<ProtectedRoute />}>
      <Route path="/home"    element={<HomePage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Route>

    {/* Catch-all → redirect to landing */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

// ---------------------------------------------------------------------------
// App — root component
// ---------------------------------------------------------------------------

const App = () => (
  <HashRouter>
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#13111c",
            color: "#e5e7eb",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            fontSize: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          },
        }}
      />
      <AppRoutes />
    </AuthProvider>
  </HashRouter>
);

export default App;
