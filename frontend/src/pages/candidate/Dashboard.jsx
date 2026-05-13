// ============================================================
// pages/candidate/Dashboard.jsx — Candidate's Main Dashboard
//
// This is the "home base" for a logged-in job seeker.
// They can see all their activity in one place.
//
// SECTIONS:
//   1. Header        — Welcome message + quick action buttons
//   2. Stats Row     — Totals: applied, shortlisted, interviews, selected
//   3. Applications  — Table of all applications with withdraw option
//   4. Interviews    — List of scheduled interviews
//   5. Documents     — Resume + cover letter links
//
// DATA FETCHED:
//   GET /api/applications/my  — all applications for this candidate
//   GET /api/interviews/my    — all scheduled interviews for this candidate
//
// ACCESS: Protected — only logged-in users with role 'candidate' can see this.
//         (Enforced by ProtectedRoute in App.jsx)
// ============================================================

import React, { useState, useEffect } from 'react';
// Link: React Router's <a> tag (no page reload)
import { Link } from 'react-router-dom';
import api from '../../api/axios';
// useAuth gives us the current user object
import { useAuth } from '../../context/AuthContext';
import { SectionLoader, InlineLoader } from '../../components/Loader';

// ── Date Formatter ────────────────────────────────────────────
// Converts ISO date string to "Jan 5, 2025" format
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

// ── Date + Time Formatter ─────────────────────────────────────
// Used for interview scheduling: "Jan 5, 2025 at 10:30 AM"
const formatDateTime = (date, time) => {
  const d = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  return time ? `${d} at ${time}` : d;
};

// ============================================================
// CandidateDashboard — Main Component
// ============================================================
const CandidateDashboard = () => {
  // Get the current user from global auth context
  const { user } = useAuth();

  // ── State Variables ───────────────────────────────────────────
  const [applications, setApplications] = useState([]);   // Array of application objects
  const [interviews, setInterviews] = useState([]);        // Array of interview objects
  const [loadingApps, setLoadingApps] = useState(true);   // Spinner for applications section
  const [loadingInterviews, setLoadingInterviews] = useState(true); // Spinner for interviews section

  // withdrawingId: tracks which application's withdraw button was clicked
  // Allows us to show a spinner on THAT specific button only
  const [withdrawingId, setWithdrawingId] = useState(null);

  const [error, setError] = useState('');

  // ── Fetch Data on Mount ───────────────────────────────────────
  // useEffect with [] runs ONCE when the component first appears
  useEffect(() => {
    fetchApplications();
    fetchInterviews();
  }, []);

  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      // /api/applications/my returns only THIS candidate's applications
      const res = await api.get('/api/applications/my');
      if (res.data.success) {
        setApplications(res.data.data);
      }
    } catch (err) {
      setError('Failed to load applications.');
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchInterviews = async () => {
    setLoadingInterviews(true);
    try {
      // /api/interviews/my returns only THIS candidate's interviews
      const res = await api.get('/api/interviews/my');
      if (res.data.success) {
        setInterviews(res.data.data);
      }
    } catch (err) {
      // Non-critical: if this fails, the interviews section just shows empty
      console.error('Failed to fetch interviews:', err);
    } finally {
      setLoadingInterviews(false);
    }
  };

  // ── Withdraw an Application ───────────────────────────────────
  const handleWithdraw = async (applicationId) => {
    // Show a native browser confirmation dialog before proceeding
    if (!window.confirm('Are you sure you want to withdraw this application? This cannot be undone.')) {
      return;
    }

    // Track which application is being withdrawn (for the button spinner)
    setWithdrawingId(applicationId);
    try {
      const res = await api.delete(`/api/applications/${applicationId}`);
      if (res.data.success) {
        // Remove the withdrawn application from LOCAL state.
        // prev.filter() creates a new array WITHOUT the withdrawn application.
        // This is faster than re-fetching all applications from the server.
        setApplications(prev => prev.filter(app => app._id !== applicationId));
      } else {
        alert('Failed to withdraw application.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to withdraw application.');
    } finally {
      setWithdrawingId(null); // Re-enable the button
    }
  };

  // ── Computed Stats ────────────────────────────────────────────
  // Calculate summary counts from the applications array.
  // These don't need separate API calls — we derive them from existing data.
  const totalApplications = applications.length;
  const shortlisted = applications.filter(a => a.status === 'shortlisted').length;
  const interviewScheduled = applications.filter(a => a.status === 'interview_scheduled').length;
  const selected = applications.filter(a => a.status === 'selected').length;

  return (
    <div style={{ paddingBottom: '60px' }}>

      {/* ── Page Header ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--secondary) 0%, #1e293b 100%)',
        padding: '40px 0',
        marginBottom: '32px',
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '4px' }}>Welcome back,</p>
              {/* user?.name uses optional chaining — safe if user is null during initial load */}
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>
                {user?.name || 'Candidate'} 👋
              </h1>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                Here's an overview of your job search activity
              </p>
            </div>
            {/* Quick action buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to="/jobs" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                Browse Jobs
              </Link>
              <Link to="/profile" className="btn btn-primary">
                My Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Error message */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Stats Row ─────────────────────────────────────── */}
        {/* stats-grid is a CSS class in index.css that creates a responsive 4-column grid */}
        <div className="stats-grid" style={{ marginBottom: '32px' }}>
          {/* Each StatCard shows one computed number from the applications array */}
          <StatCard value={totalApplications} label="Total Applications" icon="📋" color="var(--primary)" />
          <StatCard value={shortlisted} label="Shortlisted" icon="⭐" color="var(--info)" />
          <StatCard value={interviewScheduled} label="Interviews Scheduled" icon="📅" color="var(--warning)" />
          <StatCard value={selected} label="Selected" icon="🎉" color="var(--success)" />
        </div>

        {/* ── My Applications Table ─────────────────────────── */}
        <div className="card" style={{ marginBottom: '28px' }}>
          {/* section-title is a CSS class for the heading row with a right-side action */}
          <div className="section-title">
            <span>My Applications</span>
            {/* Refresh button re-fetches from the API */}
            <button onClick={fetchApplications} className="btn btn-outline btn-sm">
              ↻ Refresh
            </button>
          </div>

          {loadingApps ? (
            <SectionLoader message="Loading applications..." />
          ) : applications.length === 0 ? (
            // Empty state — shown when the candidate hasn't applied to anything yet
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No Applications Yet</h3>
              <p>Start applying for jobs to see your applications here.</p>
              <Link to="/jobs" className="btn btn-primary" style={{ marginTop: '12px' }}>
                Browse Jobs
              </Link>
            </div>
          ) : (
            // Table of all applications
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Branch</th>
                    <th>Applied Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Map over each application to render a table row */}
                  {applications.map((app) => (
                    <tr key={app._id}>
                      <td>
                        {/* app.job is a populated object from the server (contains title, department) */}
                        <div style={{ fontWeight: '600' }}>
                          {app.job?.title || 'Unknown Job'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {app.job?.department}
                        </div>
                      </td>
                      <td style={{ fontSize: '14px' }}>
                        {/* branch is nested inside job: app.job.branch.name */}
                        {app.job?.branch?.name || 'N/A'}
                      </td>
                      <td style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {/* createdAt is the preferred field, appliedAt as fallback */}
                        {formatDate(app.createdAt || app.appliedAt)}
                      </td>
                      <td>
                        {/* badge-{status} CSS class applies color from index.css */}
                        {/* replace(/_/g, ' ') converts "under_review" → "under review" */}
                        <span className={`badge badge-${app.status}`}>
                          {app.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {/* View Job button — navigates to the job detail page */}
                          {app.job?._id && (
                            <Link
                              to={`/jobs/${app.job._id}`}
                              className="btn btn-outline btn-sm"
                            >
                              View Job
                            </Link>
                          )}
                          {/* Withdraw button — only available for 'submitted' applications */}
                          {/* Once an application is reviewed/shortlisted, it can't be withdrawn */}
                          {app.status === 'submitted' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleWithdraw(app._id)}
                              // Disable the button while THIS specific application is being withdrawn
                              disabled={withdrawingId === app._id}
                            >
                              {withdrawingId === app._id
                                ? <><InlineLoader /> Withdrawing...</>
                                : 'Withdraw'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── My Interviews Section ─────────────────────────── */}
        <div className="card" style={{ marginBottom: '28px' }}>
          <div className="section-title">
            <span>My Interviews</span>
          </div>

          {loadingInterviews ? (
            <SectionLoader message="Loading interviews..." />
          ) : interviews.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <h3>No Interviews Scheduled</h3>
              <p>When HR schedules an interview for you, it will appear here.</p>
            </div>
          ) : (
            // List of interview cards
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {interviews.map((interview) => (
                <div key={interview._id} style={{
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap', // Stack content on small screens
                }}>
                  {/* Calendar icon box */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: 'var(--primary-light)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0, // Don't shrink this icon on small screens
                  }}>
                    📅
                  </div>

                  {/* Interview details: job title, date/time, HR message */}
                  <div style={{ flex: 1 }}>
                    {/* interview.application.job.title: deeply nested object chain */}
                    <h4 style={{ fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                      {interview.application?.job?.title || 'Interview'}
                    </h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {formatDateTime(interview.scheduledDate, interview.scheduledTime)}
                    </p>
                    {/* HR's message — only shown if it exists */}
                    {interview.message && (
                      <div style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.6',
                      }}>
                        <strong>Message from HR:</strong> {interview.message}
                      </div>
                    )}
                  </div>

                  <span className="badge badge-interview_scheduled">
                    Interview Scheduled
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Documents Section ─────────────────────────────── */}
        <div className="card">
          <div className="section-title">
            <span>My Documents</span>
            <Link to="/profile" className="btn btn-outline btn-sm">
              Manage Documents
            </Link>
          </div>

          {/* Two-column grid for resume and cover letter */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>

            {/* Resume card */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{ fontSize: '28px' }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Resume</div>
                {user?.resume ? (
                  // Show a link if the resume URL exists
                  <a
                    href={user.resume}
                    target="_blank"        // Open in a new tab
                    rel="noopener noreferrer" // Security: prevents new tab from accessing parent window
                    style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}
                  >
                    View Resume ↗
                  </a>
                ) : (
                  // Warning if no resume — this blocks applying for jobs
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--danger)' }}>
                      ⚠️ No resume uploaded
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cover letter card */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{ fontSize: '28px' }}>📝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Cover Letter</div>
                {user?.coverLetter ? (
                  <a
                    href={user.coverLetter}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}
                  >
                    View Cover Letter ↗
                  </a>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Not uploaded
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Warning banner if resume is missing — shown below the grid */}
          {!user?.resume && (
            <div className="alert alert-warning" style={{ marginTop: '16px' }}>
              ⚠️ You need to upload a resume before you can apply for jobs.{' '}
              <Link to="/profile" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: '600' }}>
                Upload now →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// StatCard — Individual Stat Box
//
// Used in the stats row at the top of the dashboard.
// The colored top border uses the "color" prop.
//
// Props:
//   value — the number to display
//   label — text label below the number
//   icon  — emoji or text shown on the card
//   color — CSS color for the top border and number text
// ============================================================
const StatCard = ({ value, label, icon, color }) => (
  <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-value" style={{ color }}>{value}</div>
    <div className="stat-card-label">{label}</div>
  </div>
);

export default CandidateDashboard;
