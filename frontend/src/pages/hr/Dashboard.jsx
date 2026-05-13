// ============================================================
// pages/hr/Dashboard.jsx — HR Recruiter's Main Dashboard
//
// This is the command center for HR users. Shows a high-level
// view of all recruitment activity at a glance.
//
// SECTIONS:
//   1. Header        — Welcome message + refresh button
//   2. Stats Cards   — Total jobs, applications, candidates, shortlisted
//   3. Two-Column    — Application status bar chart + Recent applications table
//   4. Quick Actions — Shortcut links to HR pages
//
// DATA FETCHED:
//   GET /api/hr/dashboard — returns aggregated stats and recent data
//
// ACCESS: Protected — only HR users can see this. (ProtectedRoute in App.jsx)
// ============================================================

import React, { useState, useEffect } from 'react';
// Link: React Router's <a> tag — no page reload
import { Link } from 'react-router-dom';
import api from '../../api/axios';
// useAuth gives us user.name for the welcome message
import { useAuth } from '../../context/AuthContext';
import { SectionLoader } from '../../components/Loader';

// ── Date Formatter ────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

// ── Status Display Labels ─────────────────────────────────────
// Maps database status values to human-readable labels.
// e.g., 'interview_scheduled' → 'Interview Scheduled'
const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  rejected: 'Rejected',
  selected: 'Selected',
};

// ============================================================
// HRDashboard — Main Component
// ============================================================
const HRDashboard = () => {
  const { user } = useAuth();

  // dashData: the entire response from /api/hr/dashboard
  // Contains: totalJobs, totalApplications, totalCandidates,
  //           applicationsByStatus (object), recentApplications (array)
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboard();
  }, []); // [] = run once only

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/hr/dashboard');
      if (res.data.success) {
        setDashData(res.data.data);
      } else {
        setError('Failed to load dashboard data.');
      }
    } catch (err) {
      setError('Unable to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Bar Chart Scaling ─────────────────────────────────────────
  // To draw the status bars proportionally, we need the maximum value.
  // Math.max(...values) finds the highest number in the array.
  // We default to 1 to avoid division by zero if all counts are 0.
  const maxStatusCount = dashData?.applicationsByStatus
    ? Math.max(...Object.values(dashData.applicationsByStatus).map(v => v || 0), 1)
    : 1;

  return (
    <div style={{ paddingBottom: '60px' }}>

      {/* ── Page Header ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--secondary) 0%, #1e293b 100%)',
        padding: '40px 0',
        marginBottom: '32px',
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p style={{ color: '#94A3B8', marginBottom: '4px', fontSize: '14px' }}>Welcome back,</p>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>
                {user?.name} 👋
              </h1>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                Here's your recruitment overview for today
              </p>
            </div>
            {/* Refresh button re-fetches all dashboard data */}
            <button onClick={fetchDashboard} className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {error && <div className="alert alert-error">{error}</div>}

        {/* Show spinner while loading, or the full dashboard when done */}
        {loading ? (
          <SectionLoader message="Loading dashboard..." />
        ) : (
          <>
            {/* ── Stats Cards ───────────────────────────────── */}
            {/* stats-grid is a responsive 4-column grid from index.css */}
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
              <StatCard
                value={dashData?.totalJobs || 0}
                label="Total Jobs"
                icon="💼"
                color="var(--primary)"
                description="Active job listings"
              />
              <StatCard
                value={dashData?.totalApplications || 0}
                label="Total Applications"
                icon="📋"
                color="var(--info)"
                description="Received so far"
              />
              <StatCard
                value={dashData?.totalCandidates || 0}
                label="Total Candidates"
                icon="👥"
                color="var(--success)"
                description="Registered candidates"
              />
              <StatCard
                // Optional chaining: dashData?.applicationsByStatus?.shortlisted
                // safely reads shortlisted count even if dashData is null
                value={dashData?.applicationsByStatus?.shortlisted || 0}
                label="Shortlisted"
                icon="⭐"
                color="var(--warning)"
                description="Ready for interviews"
              />
            </div>

            {/* ── Two-Column Layout ─────────────────────────── */}
            {/* Left: status chart (1fr), Right: recent applications (2fr) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: '28px',
              marginBottom: '28px',
              alignItems: 'start',
            }}>

              {/* ── Left: Applications by Status Bar Chart ──── */}
              <div className="card">
                <h3 className="section-title" style={{ marginBottom: '20px' }}>
                  By Status
                </h3>

                {dashData?.applicationsByStatus ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Object.entries() converts the object to [key, value] pairs */}
                    {Object.entries(STATUS_LABELS).map(([status, label]) => {
                      const count = dashData.applicationsByStatus[status] || 0;
                      // Calculate this status's percentage of the maximum count
                      // for proportional bar widths
                      const percentage = Math.round((count / maxStatusCount) * 100);

                      return (
                        <div key={status}>
                          {/* Label + count on the same row */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '4px',
                            fontSize: '13px',
                          }}>
                            <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>
                              {label}
                            </span>
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                              {count}
                            </span>
                          </div>

                          {/* Bar: the inner div's width is set as a percentage */}
                          <div style={{
                            height: '6px',
                            background: 'var(--bg)',  // Track (background of the bar)
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${percentage}%`,       // Proportional fill
                              borderRadius: '3px',
                              background: getStatusColor(status), // Color from helper below
                              transition: 'width 0.5s ease', // Smooth animation when data loads
                            }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No data available.</p>
                )}
              </div>

              {/* ── Right: Recent Applications Table ─────────── */}
              <div className="card">
                <div className="section-title">
                  <span>Recent Applications</span>
                  <Link to="/hr/jobs" className="btn btn-outline btn-sm">
                    View All →
                  </Link>
                </div>

                {dashData?.recentApplications && dashData.recentApplications.length > 0 ? (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Job</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashData.recentApplications.map((app) => (
                          <tr key={app._id}>
                            <td>
                              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                {app.candidate?.name || 'Unknown'}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {app.candidate?.email}
                              </div>
                            </td>
                            <td style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                              {app.job?.title || 'N/A'}
                            </td>
                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              {formatDate(app.createdAt || app.appliedAt)}
                            </td>
                            <td>
                              {/* badge-{status} applies color from index.css */}
                              <span className={`badge badge-${app.status}`}>
                                {app.status?.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h3>No Applications Yet</h3>
                    <p>Applications will appear here once candidates start applying.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Quick Actions Grid ───────────────────────── */}
            <div className="card">
              <h3 className="section-title">Quick Actions</h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}>
                {/* Each QuickAction is a large clickable card that links to a page */}
                <QuickAction
                  icon="➕"
                  title="Post New Job"
                  description="Create a new job listing"
                  to="/hr/jobs"
                  color="var(--primary)"
                />
                <QuickAction
                  icon="📋"
                  title="Manage Jobs"
                  description="Edit or delete job listings"
                  to="/hr/jobs"
                  color="var(--info)"
                />
                <QuickAction
                  icon="🏢"
                  title="Manage Branches"
                  description="Add or edit branch locations"
                  to="/hr/branches"
                  color="var(--success)"
                />
                <QuickAction
                  icon="👥"
                  title="Browse Candidates"
                  description="Review all applicants"
                  to="/hr/jobs"
                  color="var(--warning)"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Collapse the 2-column layout on mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 2fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================
// Sub-Components
// ============================================================

// StatCard — One stats box in the top row
// Props: value, label, icon, color, description
const StatCard = ({ value, label, icon, color, description }) => (
  <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value" style={{ color }}>{value}</div>
        {description && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ fontSize: '28px' }}>{icon}</div>
    </div>
  </div>
);

// QuickAction — Clickable card that navigates to a page
// Uses Link (React Router) for navigation without page reload
const QuickAction = ({ icon, title, description, to, color }) => (
  <Link
    to={to}
    style={{
      textDecoration: 'none', // Remove default link underline
      display: 'block',
      padding: '20px',
      background: 'var(--bg)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      transition: 'var(--transition)',
    }}
    // Hover: highlight the border in the card's accent color
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color;
      e.currentTarget.style.background = 'var(--surface)';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.background = 'var(--bg)';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
      {title}
    </div>
    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{description}</div>
  </Link>
);

// getStatusColor — Returns a CSS color for each application status
// Used by the bar chart to give each status a distinct color
const getStatusColor = (status) => {
  const colors = {
    submitted:          '#94A3B8', // Gray — newly submitted
    under_review:       'var(--primary)', // Blue — being reviewed
    shortlisted:        'var(--info)',    // Light blue — shortlisted
    interview_scheduled:'var(--warning)', // Yellow — interview coming up
    rejected:           'var(--danger)',  // Red — rejected
    selected:           'var(--success)', // Green — hired
  };
  return colors[status] || '#94A3B8'; // Default to gray if status unknown
};

export default HRDashboard;
