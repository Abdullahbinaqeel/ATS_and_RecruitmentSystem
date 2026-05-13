// ============================================================
// pages/JobDetail.jsx — Full Job Detail Page
//
// Accessed at URL: /jobs/:id  (e.g., /jobs/abc123)
// The :id part is read from the URL using useParams().
//
// WHAT THIS PAGE SHOWS:
//   - Full job title, department, branch, seats, posted date
//   - Full description (split by newlines into paragraphs)
//   - Requirements list with bullet points
//   - Right sidebar: Apply section (content changes based on user state)
//
// APPLY SIDEBAR LOGIC:
//   - NOT logged in          → "Login to Apply" prompt
//   - Logged in as HR        → "You are viewing as HR" info message
//   - Logged in as candidate, job closed → "No longer accepting" warning
//   - Logged in as candidate, already applied → "Application Submitted" badge
//   - Logged in as candidate, no resume → Warning to upload resume first
//   - Logged in as candidate, ready → "Apply Now" button
//
// HR ACTIONS (shown in the header when logged in as HR):
//   - View Applicants, Edit Job, Delete Job
// ============================================================

import React, { useState, useEffect } from 'react';

// useParams: reads URL parameters like :id from the route
// useNavigate: gives a navigate() function to redirect programmatically
// Link: React Router's <a> — no page reload
import { useParams, useNavigate, Link } from 'react-router-dom';

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { SectionLoader, InlineLoader } from '../components/Loader';

// ── Date Formatter ────────────────────────────────────────────
// Converts ISO date string to human-readable format: "January 5, 2025"
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const JobDetail = () => {
  // useParams() reads :id from the URL /jobs/:id
  // Example: if URL is /jobs/abc123, then id = 'abc123'
  const { id } = useParams();

  // navigate(-1) goes back to the previous page in browser history
  const navigate = useNavigate();

  // Get the current user and auth status from global context
  const { user, isAuthenticated } = useAuth();

  // ── State Variables ───────────────────────────────────────────
  const [job, setJob] = useState(null);         // The job object from the API
  const [loading, setLoading] = useState(true);  // True while fetching job data
  const [error, setError] = useState('');        // Error message if fetch fails

  const [applying, setApplying] = useState(false);       // True while submit is in progress
  const [applyError, setApplyError] = useState('');      // Error from apply attempt
  const [applySuccess, setApplySuccess] = useState('');  // Success message after applying
  const [hasApplied, setHasApplied] = useState(false);   // Has this candidate already applied?

  const [deleting, setDeleting] = useState(false);       // True while delete is in progress (HR)

  // ── Fetch Job + Check Application Status ─────────────────────
  // [id, isAuthenticated] means this re-runs if the URL id changes
  // or if the user's auth status changes (e.g., they just logged in)
  useEffect(() => {
    fetchJob();
    // Only check application status if a CANDIDATE is logged in
    if (isAuthenticated && user?.role === 'candidate') {
      checkIfApplied();
    }
  }, [id, isAuthenticated]);

  // Fetch the job data from the server
  const fetchJob = async () => {
    setLoading(true);
    setError('');
    try {
      // Template literal `/api/jobs/${id}` injects the URL parameter
      const response = await api.get(`/api/jobs/${id}`);
      if (response.data.success) {
        setJob(response.data.data);
      } else {
        setError('Job not found.');
      }
    } catch (err) {
      setError('Failed to load job details. The job may not exist.');
    } finally {
      setLoading(false);
    }
  };

  // Check if the logged-in candidate has already applied to this job
  const checkIfApplied = async () => {
    try {
      // Fetch all of this candidate's applications
      const response = await api.get('/api/applications/my');
      if (response.data.success) {
        // .some() returns true if ANY application matches this job ID
        // app.job?._id handles cases where job is an object vs string
        const applied = response.data.data.some(
          (app) => (app.job?._id || app.job) === id
        );
        setHasApplied(applied);
      }
    } catch (err) {
      // This is non-critical — if it fails, we just don't show the "already applied" badge
      console.error('Failed to check application status:', err);
    }
  };

  // ── Handle Apply Button Click ─────────────────────────────────
  const handleApply = async () => {
    setApplyError('');
    setApplySuccess('');

    // Require the candidate to have a resume uploaded before applying
    if (!user?.resume) {
      setApplyError('Please upload your resume on your Profile page before applying.');
      return;
    }

    setApplying(true);
    try {
      // POST to /api/applications with the job ID
      const response = await api.post('/api/applications', { jobId: id });
      if (response.data.success) {
        setHasApplied(true); // Mark as applied so the button changes
        setApplySuccess('Application submitted successfully!');
      } else {
        setApplyError(response.data.message || 'Application failed.');
      }
    } catch (err) {
      // error.response?.data?.message safely reads nested error message from server
      setApplyError(err.response?.data?.message || 'Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // ── Handle Delete (HR Only) ───────────────────────────────────
  const handleDelete = async () => {
    // window.confirm shows a native browser confirmation dialog
    if (!window.confirm('Are you sure you want to delete this job listing? This action cannot be undone.')) {
      return;
    }
    setDeleting(true);
    try {
      const response = await api.delete(`/api/jobs/${id}`);
      if (response.data.success) {
        // After deleting, go back to the HR jobs management page
        navigate('/hr/jobs');
      } else {
        alert('Failed to delete job.');
      }
    } catch (err) {
      alert('Failed to delete job. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render: Loading / Error / Not Found / Main ───────────────

  // Show spinner while loading
  if (loading) return <SectionLoader message="Loading job details..." />;

  // Show error state with a link back to jobs
  if (error) return (
    <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div className="empty-state-icon">❌</div>
      <h2 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Job Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
      <Link to="/jobs" className="btn btn-primary">Back to Jobs</Link>
    </div>
  );

  // Safety check — shouldn't happen after loading completes, but prevents crashes
  if (!job) return null;

  // Is the job currently accepting applications?
  const isOpen = job.status === 'open';

  return (
    <div style={{ paddingBottom: '60px' }}>

      {/* ── Job Header Banner ─────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--secondary) 0%, #1e293b 100%)',
        padding: '40px 0',
        marginBottom: '40px',
      }}>
        <div className="container">
          {/* Back button — navigate(-1) goes to the previous page in history */}
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '20px',
              fontFamily: 'inherit',
            }}
          >
            ← Back
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              {/* Open/Closed status badge */}
              <span className={`badge badge-${isOpen ? 'open' : 'closed'}`} style={{ marginBottom: '12px' }}>
                {isOpen ? '● Open' : '● Closed'}
              </span>

              {/* Job title */}
              <h1 style={{
                fontSize: 'clamp(24px, 4vw, 36px)',
                fontWeight: '800',
                color: 'white',
                marginBottom: '12px',
              }}>
                {job.title}
              </h1>

              {/* Meta tags row: department, branch, seats, date */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                <MetaTag icon="🏢" text={job.department} />
                <MetaTag icon="📍" text={job.branch?.name || 'N/A'} />
                <MetaTag icon="👥" text={`${job.seats} Seat${job.seats !== 1 ? 's' : ''}`} />
                <MetaTag icon="📅" text={`Posted ${formatDate(job.createdAt)}`} />
              </div>
            </div>

            {/* HR-only action buttons — only shown when the logged-in user is HR */}
            {isAuthenticated && user?.role === 'hr' && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link
                  to={`/hr/jobs/${id}/applicants`}
                  className="btn btn-primary"
                >
                  View Applicants
                </Link>
                <Link
                  to={`/hr/jobs`}
                  className="btn btn-outline"
                  style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
                >
                  Edit Job
                </Link>
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting} // Disable button while deleting
                >
                  {deleting ? <><InlineLoader /> Deleting...</> : 'Delete Job'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content: 2-Column Layout ────────────────────── */}
      <div className="container">
        {/* CSS Grid: left column is flexible (1fr), right column is fixed 320px */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '32px',
          alignItems: 'start',
        }}>

          {/* ── LEFT COLUMN: Description + Requirements ──────── */}
          <div>
            {/* Job Description card */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Job Description
              </h2>
              <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '15px' }}>
                {/* Split description by newlines and render each line as a paragraph */}
                {job.description
                  ? job.description.split('\n').map((paragraph, i) => (
                    paragraph.trim() ? <p key={i} style={{ marginBottom: '12px' }}>{paragraph}</p> : null
                  ))
                  : <p>No description provided.</p>
                }
              </div>
            </div>

            {/* Requirements card — only shown if the job has requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="card">
                <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                  Requirements
                </h2>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Map each requirement string to a list item with a blue dot */}
                  {job.requirements.map((req, index) => (
                    <li key={index} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: '15px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.6',
                    }}>
                      {/* Small blue circular bullet point */}
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        marginTop: '9px',
                        flexShrink: 0, // Don't let the dot shrink on narrow screens
                      }}></span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Apply Sidebar ──────────────────── */}
          {/* position: 'sticky' keeps the sidebar visible as the user scrolls */}
          {/* top: '84px' accounts for the sticky navbar height */}
          <div style={{ position: 'sticky', top: '84px' }}>
            <div className="card">
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
                Apply for this Role
              </h3>

              {/* Branch info panel */}
              <div style={{
                background: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Branch Location</div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{job.branch?.name || 'N/A'}</div>
                {job.branch?.city && <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{job.branch.city}</div>}
                {job.branch?.address && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{job.branch.address}</div>}
              </div>

              {/* Open seats display */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
                marginBottom: '20px',
              }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Open Seats</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{job.seats}</span>
              </div>

              {/* Apply feedback messages */}
              {applyError && <div className="alert alert-error">{applyError}</div>}
              {applySuccess && <div className="alert alert-success">{applySuccess}</div>}

              {/* ── Case 1: Not logged in ─────────────────────── */}
              {!isAuthenticated && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    You need to be logged in to apply for this job.
                  </p>
                  <Link to="/login" className="btn btn-primary w-full" style={{ display: 'block', textAlign: 'center' }}>
                    Login to Apply
                  </Link>
                  <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                      Sign up free
                    </Link>
                  </p>
                </div>
              )}

              {/* ── Case 2: Logged in as CANDIDATE ───────────── */}
              {isAuthenticated && user?.role === 'candidate' && (
                <>
                  {/* Sub-case A: Job is closed */}
                  {!isOpen ? (
                    <div className="alert alert-warning">
                      This position is no longer accepting applications.
                    </div>
                  ) : hasApplied ? (
                    // Sub-case B: Already applied
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <span className="badge badge-submitted" style={{ fontSize: '15px', padding: '10px 20px' }}>
                        ✓ Application Submitted
                      </span>
                      <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        You've already applied for this position.
                        <br />
                        <Link to="/dashboard" style={{ color: 'var(--primary)' }}>Track your application →</Link>
                      </p>
                    </div>
                  ) : (
                    // Sub-case C: Can apply
                    <>
                      {/* Warning if no resume uploaded yet */}
                      {!user?.resume && (
                        <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                          ⚠️ Please upload your resume on your{' '}
                          <Link to="/profile" style={{ color: 'inherit', textDecoration: 'underline' }}>Profile page</Link>{' '}
                          before applying.
                        </div>
                      )}
                      {/* Apply button — disabled if no resume or currently submitting */}
                      <button
                        className="btn btn-primary w-full"
                        onClick={handleApply}
                        disabled={applying || !user?.resume}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        {applying ? <><InlineLoader /> Submitting...</> : 'Apply Now'}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* ── Case 3: Logged in as HR ───────────────────── */}
              {isAuthenticated && user?.role === 'hr' && (
                <div className="alert alert-info">
                  You are viewing this as HR. Use the buttons above to manage this job.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile CSS override: stack the 2-column layout on small screens */}
        <style>{`
          @media (max-width: 768px) {
            div[style*="grid-template-columns: 1fr 320px"] {
              grid-template-columns: 1fr !important;
            }
            div[style*="position: sticky"] {
              position: static !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

// ============================================================
// MetaTag — Small icon+text label shown in the job header
// Props: icon (emoji), text (string)
// ============================================================
const MetaTag = ({ icon, text }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
    fontWeight: '500',
  }}>
    <span>{icon}</span>
    <span>{text}</span>
  </div>
);

export default JobDetail;
