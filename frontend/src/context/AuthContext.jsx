/**
 * AuthContext.jsx — Global authentication state management.
 *
 * IMPORTANT: Token is stored ONLY in client.js module-level variable.
 * This file imports setToken/getToken from client.js — it does NOT
 * define its own token store. This ensures the Axios interceptor in
 * client.js always has the latest token.
 */

import { createContext, useContext, useEffect, useState } from "react";
import { setToken, getToken, getMe } from "../api/client";

// ---------------------------------------------------------------------------
// Context definition
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);


// ---------------------------------------------------------------------------
// AuthProvider component
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      try {
        // -- Step 1: Check URL for ?token= param (coming back from OAuth) --
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken  = urlParams.get("token");

        if (urlToken) {
          // Store token in client.js — this is the ONLY token store
          setToken(urlToken);

          // Remove token from URL immediately
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        // -- Step 2: Use token from client.js store --
        const activeToken = getToken();

        if (!activeToken) {
          setIsLoading(false);
          return;
        }

        // -- Step 3: Verify token and load user info --
        const response = await getMe();
        setUser(response.data);

        // If logged in via URL token redirect, navigate to /home
        if (urlToken) {
          window.location.href = "/home";
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);


  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------

  const logout = () => {
    setToken(null);
    setUser(null);
  };


  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value = {
    user,
    token: getToken(),
    isAuthenticated: !!user,
    isLoading,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


// ---------------------------------------------------------------------------
// useAuth hook
// ---------------------------------------------------------------------------

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
};

export default AuthContext;