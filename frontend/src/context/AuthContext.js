// ============================================================
// context/AuthContext.js — Global Authentication State
//
// WHAT IS REACT CONTEXT?
// Normally, if you want to share data between components,
// you pass it as "props" from parent → child → grandchild.
// This gets messy when many components need the same data.
//
// React Context solves this: you put data in a "context" and
// ANY component in the tree can read it directly — no prop drilling.
//
// WHAT THIS FILE PROVIDES:
//   - user      — the currently logged-in user object (or null)
//   - token     — the JWT token string (or null)
//   - loading   — true while checking if the user is already logged in
//   - login()   — function to log in
//   - register() — function to register a new account
//   - logout()  — function to log out
//   - updateUser() — function to refresh user data after profile edit
//   - isAuthenticated — boolean shortcut: true if user is logged in
//
// FLOW ON APP START:
//   1. AuthProvider mounts → checks localStorage for a saved token
//   2. If found → validates it with the server → restores user state
//   3. Sets loading = false → app renders routes
//
// WHERE IT'S USED:
//   - Wrapped around the whole app in App.jsx (AuthProvider)
//   - Read in any component via the useAuth() hook
// ============================================================

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios'; // Our pre-configured Axios instance

// ── Step 1: Create the Context ────────────────────────────────
// createContext() creates an empty "box". We fill it with data
// in the AuthProvider below. null is just the default before it's filled.
const AuthContext = createContext(null);

// ============================================================
// AuthProvider Component
//
// This is a special component that wraps the entire app (in App.jsx).
// It "provides" auth data to all its children via Context.
//
// Props:
//   children — everything nested inside <AuthProvider>...</AuthProvider>
// ============================================================
export const AuthProvider = ({ children }) => {
  // ── State Variables ───────────────────────────────────────
  // useState() creates a reactive variable. When it changes, React re-renders.
  // The argument is the initial value.

  const [user, setUser] = useState(null);   // Object with name, email, role, etc. (null = not logged in)
  const [token, setToken] = useState(null); // JWT string (null = not logged in)

  // loading = true while we're checking if the user is already logged in (on page refresh)
  // We start as true to BLOCK the app from rendering until the check is done.
  // Without this, protected pages would briefly redirect to /login before the check finishes.
  const [loading, setLoading] = useState(true);

  // ============================================================
  // Restore Session on App Start
  //
  // useEffect runs code AFTER the component renders.
  // The [] (empty dependency array) means it runs ONLY ONCE — on mount.
  // This is where we check "was this user already logged in before?"
  // ============================================================
  useEffect(() => {
    const restoreSession = async () => {
      // Check if a token was saved from a previous login
      const savedToken = localStorage.getItem('ats_token');

      if (savedToken) {
        // A token exists — put it in state so Axios can use it (see axios.js interceptor)
        setToken(savedToken);
        try {
          // Ask the server: "Is this token still valid? Who does it belong to?"
          // The axios interceptor (api/axios.js) automatically attaches the token here
          const response = await api.get('/api/auth/me');

          if (response.data.success) {
            // Token is valid — restore the user object so the app knows who's logged in
            setUser(response.data.data);
          } else {
            // Token exists but server says it's not valid — clear everything
            clearAuthData();
          }
        } catch (error) {
          // Server rejected the token (e.g., expired) — log the user out silently
          clearAuthData();
        }
      }

      // Done checking — allow the app to render now
      setLoading(false);
    };

    restoreSession();
  }, []); // The [] means "only run this once when the component first appears"

  // ── Helper: Clear All Auth Data ──────────────────────────────
  // Removes token and user from both state (triggers re-render)
  // and localStorage (so the session doesn't persist after refresh)
  const clearAuthData = () => {
    localStorage.removeItem('ats_token');
    localStorage.removeItem('ats_user');
    setToken(null);
    setUser(null);
  };

  // ============================================================
  // login(email, password)
  //
  // Called by the Login page when the user submits the form.
  // Returns { success: true, user } or { success: false, message: '...' }
  //
  // async/await means this function is asynchronous — it waits for
  // the server response before returning.
  // ============================================================
  const login = async (email, password) => {
    try {
      // POST to /api/auth/login — sends email and password to the server
      const response = await api.post('/api/auth/login', { email, password });

      if (response.data.success) {
        // Destructure the response to get the token and user data
        const { token: newToken, user: userData } = response.data.data;

        // Save to React state — this causes components to re-render immediately
        setToken(newToken);
        setUser(userData);

        // Save to localStorage — this keeps the session alive after a page refresh
        // JSON.stringify converts the object to a string (localStorage only stores strings)
        localStorage.setItem('ats_token', newToken);
        localStorage.setItem('ats_user', JSON.stringify(userData));

        return { success: true, user: userData };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      // error.response?.data?.message uses "optional chaining" (?.)
      // It safely accesses nested properties without crashing if any are undefined
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    }
  };

  // ============================================================
  // register(name, email, password, role)
  //
  // Called by the Register page when the form is submitted.
  // On success, redirects to the login page (we don't auto-login after registration).
  // ============================================================
  const register = async (name, email, password, role) => {
    try {
      const response = await api.post('/api/auth/register', { name, email, password, role });

      if (response.data.success) {
        return { success: true };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message };
    }
  };

  // ============================================================
  // logout()
  //
  // useCallback() is a performance optimization.
  // It ensures this function is not re-created on every render.
  // The [] means it never changes — only created once.
  // ============================================================
  const logout = useCallback(() => {
    // Clear all auth data from state and localStorage
    clearAuthData();
    // Redirect to the home page using a full page navigation
    // (window.location.href instead of navigate() because we need a hard reset)
    window.location.href = '/';
  }, []);

  // ============================================================
  // updateUser(userData)
  //
  // Called from the Profile page after the user saves profile changes.
  // Updates user data in state AND localStorage so both stay in sync.
  // ============================================================
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('ats_user', JSON.stringify(userData));
  };

  // ── Context Value ─────────────────────────────────────────────
  // This is the "package" of data and functions we share with all child components.
  // Any component that calls useAuth() gets access to all of these.
  const contextValue = {
    user,                    // The logged-in user object (null if not logged in)
    token,                   // The JWT token string
    loading,                 // True while the session check is still running
    login,                   // Function: log in with email + password
    register,                // Function: create a new account
    logout,                  // Function: log out and go home
    updateUser,              // Function: update user data (used after profile edit)
    isAuthenticated: !!user, // !! converts user to a boolean: null → false, object → true
  };

  return (
    // AuthContext.Provider wraps all children and makes contextValue available to them.
    // Any child component can call useContext(AuthContext) to read contextValue.
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// useAuth() — Custom Hook
//
// A "hook" is a function that lets you use React features.
// This custom hook is just a shortcut for useContext(AuthContext).
//
// Instead of writing this in every component:
//   const { user, login } = useContext(AuthContext);
//
// You can write this:
//   const { user, login } = useAuth();
//
// It also throws a helpful error if you forget to wrap your
// component inside AuthProvider.
// ============================================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // This error appears in the console if a developer uses useAuth()
    // outside of an AuthProvider wrapper
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};

export default AuthContext;
