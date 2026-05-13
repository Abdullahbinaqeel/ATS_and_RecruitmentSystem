// ============================================================
// components/ProtectedRoute.jsx — Route Access Guard
//
// WHAT IS A PROTECTED ROUTE?
// Some pages should only be accessible to logged-in users.
// Some pages should only be accessible to specific roles (candidate or hr).
// ProtectedRoute is a "wrapper" component that enforces these rules.
//
// HOW IT WORKS:
//   1. Check if the app is still loading auth state → show spinner
//   2. Check if the user is logged in → if not, redirect to /login
//   3. Check if the user's role is allowed → if not, redirect to /unauthorized
//   4. If all checks pass → render the actual page
//
// USAGE IN App.jsx:
//   <Route path="/dashboard" element={
//     <ProtectedRoute allowedRoles={['candidate']}>
//       <CandidateDashboard />   ← only shown if checks pass
//     </ProtectedRoute>
//   } />
//
// PROPS:
//   children     — the page component to render if access is allowed
//   allowedRoles — array of role strings that can access this route
//                  e.g., ['candidate'] or ['hr'] or ['hr', 'candidate']
// ============================================================

import React from 'react';

// Navigate is a React Router component that causes an IMMEDIATE redirect.
// Rendering <Navigate to="/login" /> is like calling window.location.href = '/login'
// but done the "React way" (works with browser history properly).
import { Navigate } from 'react-router-dom';

// useAuth() gives us access to user, loading, isAuthenticated from AuthContext
import { useAuth } from '../context/AuthContext';

// Loader shows a spinner while we wait for auth state to be determined
import Loader from './Loader';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  // Get current auth state from the global context
  // isAuthenticated is a boolean: true if user is logged in
  const { user, loading, isAuthenticated } = useAuth();

  // ── Check 1: Still loading? ───────────────────────────────────
  // On page refresh, the app needs a moment to check localStorage
  // and validate the token with the server. During this time, we
  // MUST show a spinner instead of redirecting — otherwise the app
  // would incorrectly redirect a logged-in user to /login.
  if (loading) {
    return <Loader message="Checking authentication..." />;
  }

  // ── Check 2: Is the user logged in? ──────────────────────────
  // If isAuthenticated is false (no user in state), redirect to login.
  // replace={true} means this navigation replaces the current history entry.
  // That way, pressing the browser "Back" button won't loop back here.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ── Check 3: Does the user have the right role? ───────────────
  // allowedRoles.length > 0 means we actually specified roles to check.
  // !allowedRoles.includes(user.role) means the user's role is NOT in the allowed list.
  // Example: user.role = 'candidate' but allowedRoles = ['hr'] → redirect to /unauthorized
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ── All Checks Passed: Render the Protected Page ─────────────
  // "children" is the component wrapped inside <ProtectedRoute>.
  // For example, if allowedRoles passes, <CandidateDashboard /> is rendered here.
  return children;
};

export default ProtectedRoute;
