// App.jsx — Root component of the entire application
//
// This file does two main things:
//   1. Sets up React Router — maps URL paths to page components
//   2. Wraps everything in AuthProvider — makes auth state available everywhere
//
// ROUTING EXPLAINED:
// React Router intercepts navigation (link clicks, URL changes)
// and renders the matching component WITHOUT reloading the page.
// This is what makes React a "Single Page Application" (SPA).
//
// Route structure:
//   /               → Home page (public)
//   /jobs           → Browse jobs (public)
//   /jobs/:id       → Job detail (public)
//   /login          → Login form (public)
//   /register       → Register form (public)
//   /unauthorized   → 403 page (public)
//   /dashboard      → Candidate dashboard (requires login + candidate role)
//   /profile        → Candidate profile (requires login + candidate role)
//   /hr/dashboard   → HR dashboard (requires login + hr role)
//   /hr/jobs        → Manage jobs (requires login + hr role)
//   /hr/jobs/:jobId/applicants → View applicants (requires login + hr role)
//   /hr/branches    → Manage branches (requires login + hr role)
//   *               → Catch-all: redirect to /

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
// ThemeProvider wraps the whole app so every component can access
// the current theme (dark/light) and the toggleTheme function
import { ThemeProvider } from './context/ThemeContext';

// Layout components (always visible)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Loader from './components/Loader';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';

// Candidate pages (require 'candidate' role)
import CandidateDashboard from './pages/candidate/Dashboard';
import CandidateProfile from './pages/candidate/Profile';

// HR pages (require 'hr' role)
import HRDashboard from './pages/hr/Dashboard';
import ManageJobs from './pages/hr/ManageJobs';
import JobApplicants from './pages/hr/JobApplicants';
import ManageBranches from './pages/hr/ManageBranches';

// ============================================================
// AppRoutes — Defined inside AppLayout so it can access useAuth()
// We need useAuth() to show a loading screen while auth is being checked
// ============================================================
const AppRoutes = () => {
  const { loading } = useAuth();

  // While we're checking if the user is already logged in (on refresh),
  // show a full-page loader. Without this, protected routes would
  // redirect to /login before the check finishes.
  if (loading) {
    return <Loader message="Starting TalentBridge..." />;
  }

  return (
    // The flex layout makes the footer stick to the bottom even on short pages
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Navbar is shown on EVERY page */}
      <Navbar />

      {/* Main content area grows to fill available space */}
      <main style={{ flex: 1 }}>
        {/* <Routes> renders the first <Route> that matches the current URL */}
        <Routes>

          {/* ========================
              PUBLIC ROUTES
              Anyone can access these — no login required
              ======================== */}
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ========================
              CANDIDATE ROUTES
              Only accessible to logged-in users with role 'candidate'
              ======================== */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateProfile />
              </ProtectedRoute>
            }
          />

          {/* ========================
              HR ROUTES
              Only accessible to logged-in users with role 'hr'
              ======================== */}
          <Route
            path="/hr/dashboard"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HRDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/jobs"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <ManageJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/jobs/:jobId/applicants"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <JobApplicants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/branches"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <ManageBranches />
              </ProtectedRoute>
            }
          />

          {/* ========================
              CATCH-ALL ROUTE
              Any unknown URL redirects to the home page
              The * is a wildcard that matches any path
              ======================== */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>

      {/* Footer is shown on EVERY page */}
      <Footer />
    </div>
  );
};

// ============================================================
// App — The root component
//
// Wraps everything in:
//   1. ThemeProvider — provides dark/light theme to all components
//   2. BrowserRouter — enables URL-based routing
//   3. AuthProvider — provides auth state to all components
//
// The order matters: AuthProvider must be inside BrowserRouter
// so that useNavigate() works inside AuthContext.
// ThemeProvider is outermost so it applies the data-theme attribute
// on <html> before anything renders.
// ============================================================
const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
