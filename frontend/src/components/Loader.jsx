// ============================================================
// components/Loader.jsx — Reusable Loading Spinners
//
// This file exports THREE different loader components for
// different contexts. Using separate components (rather than one
// with lots of props) makes the calling code cleaner.
//
// Loader (default)   — Full-page spinner shown while auth is being
//                      checked on first load. Covers the whole viewport.
//
// SectionLoader      — Spinner shown inside a page section while
//                      data is being fetched from the API. Takes up
//                      less space than a full-page loader.
//
// InlineLoader       — Tiny spinner placed INSIDE a button while
//                      an action is in progress (e.g., "Submitting...").
//
// WHERE USED:
//   - Loader: App.jsx, ProtectedRoute.jsx
//   - SectionLoader: most page components (Jobs, Dashboard, etc.)
//   - InlineLoader: any button that triggers an async action
// ============================================================

import React from 'react';
import { LuBriefcase } from 'react-icons/lu';

// ── Full-Page Loader ──────────────────────────────────────────
// Props:
//   message (string) — text shown below the spinner, default "Loading…"
//
// The CSS class "loader-fullpage" (defined in index.css) centers this
// vertically and horizontally in the full viewport.
const Loader = ({ message = 'Loading…' }) => (
  <div className="loader-fullpage" style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
  }}>
    {/* Branded logo mark — rust gradient square */}
    <div style={{
      width: '44px', height: '44px', borderRadius: '12px',
      background: 'linear-gradient(135deg, #D97706, #EA580C)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px',
    }}>
      {/* Briefcase icon from react-icons */}
      <LuBriefcase color="white" size={24} strokeWidth={2.2} />
    </div>

    {/* The spinning circle — its animation is defined in index.css */}
    <div className="spinner" />

    {/* Status message shown below the spinner */}
    <p style={{ fontSize: '14px', color: 'var(--text-on-dark-2)', fontWeight: '500' }}>{message}</p>
  </div>
);

// ── Section Loader ────────────────────────────────────────────
// Used inside page sections (e.g., while the jobs list is loading).
// The CSS class "loading-state" adds padding and centering.
export const SectionLoader = ({ message = 'Loading…' }) => (
  <div className="loading-state">
    <div className="spinner" />
    <p style={{ color: 'var(--text-muted)' }}>{message}</p>
  </div>
);

// ── Inline Loader ─────────────────────────────────────────────
// A tiny spinner placed inside a button while an action is running.
// display: 'inline-block' keeps it on the same line as button text.
// spinner-sm makes it smaller; spinner-white makes it white (for dark buttons).
export const InlineLoader = () => (
  <div className="spinner spinner-sm spinner-white" style={{ display: 'inline-block' }} />
);

// Default export is the full-page Loader (the most commonly imported one)
export default Loader;
