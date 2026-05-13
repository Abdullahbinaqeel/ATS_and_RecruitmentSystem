// ============================================================
// pages/Unauthorized.jsx — 403 Access Denied Page
//
// Shown when a user navigates to a page they don't have permission for.
// This happens when ProtectedRoute detects a role mismatch.
//
// EXAMPLE SCENARIOS:
//   - A candidate tries to visit /hr/dashboard → sees this page
//   - An HR user tries to visit /dashboard → sees this page
//
// CONTENT:
//   - "403" error code
//   - Lock icon
//   - Explanation message (includes their actual role if logged in)
//   - Action buttons: Go Back, Home, My Dashboard
//
// WHERE IT'S LINKED FROM: ProtectedRoute.jsx (via <Navigate to="/unauthorized">)
// ============================================================

import React from 'react';
// Link: navigates without page reload
// useNavigate: gives navigate() function for the "Go Back" button
import { Link, useNavigate } from 'react-router-dom';
// useAuth: lets us read the current user's role for the personalized message
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  // navigate(-1) goes back to the previous page in browser history
  const navigate = useNavigate();

  // Get current user and auth status from global context
  const { user, isAuthenticated } = useAuth();

  return (
    <div style={{
      minHeight: '70vh',          // At least 70% of viewport height
      display: 'flex',
      alignItems: 'center',      // Vertically centered
      justifyContent: 'center',  // Horizontally centered
      padding: '60px 24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '480px' }}>

        {/* "403" displayed in large gradient text */}
        {/* WebkitBackgroundClip + WebkitTextFillColor creates a gradient text effect */}
        <div style={{
          fontSize: '100px',
          fontWeight: '900',
          background: 'linear-gradient(135deg, var(--danger), #f97316)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: '1',
          marginBottom: '16px',
        }}>
          403
        </div>

        {/* Lock emoji as a visual symbol for "access denied" */}
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: '800',
          color: 'var(--text-primary)',
          marginBottom: '12px',
        }}>
          Access Denied
        </h1>

        {/* Error message — conditionally shows the user's role if they're logged in */}
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          lineHeight: '1.7',
          marginBottom: '32px',
        }}>
          You don't have permission to view this page.
          {/* Only show role info if the user IS logged in (avoids "undefined" display) */}
          {isAuthenticated && user && (
            <span>
              {' '}Your current role is <strong>{user.role}</strong>, which doesn't have access to this section.
            </span>
          )}
        </p>

        {/* ── Action Buttons ─────────────────────────────────── */}
        {/* flexWrap: 'wrap' allows buttons to stack vertically on narrow screens */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>

          {/* Go back — uses browser history (navigate(-1)) */}
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline"
          >
            ← Go Back
          </button>

          {/* Go home — always available */}
          <Link to="/" className="btn btn-primary">
            🏠 Home Page
          </Link>

          {/* Go to their role-specific dashboard — only shown when logged in */}
          {isAuthenticated && user && (
            <Link
              // Redirect to the correct dashboard based on role
              to={user.role === 'hr' ? '/hr/dashboard' : '/dashboard'}
              className="btn btn-secondary"
            >
              My Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
