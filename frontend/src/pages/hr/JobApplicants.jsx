// ============================================================
// pages/hr/JobApplicants.jsx — View and Manage Job Applicants
//
// Accessed at: /hr/jobs/:jobId/applicants
// The jobId comes from the URL via useParams().
//
// HR CAN:
//   - See all candidates who applied for this specific job
//   - Change an applicant's status via an inline dropdown
//   - Open a "Send Email" modal (shortlist/interview/rejection/custom)
//   - Open a "Schedule Interview" modal
//   - View the applicant's resume and cover letter PDFs
//
// DATA FETCHED:
//   GET /api/jobs/:jobId                  — job title/branch for the page header
//   GET /api/applications/job/:jobId      — all applications for this job
//
// MODALS:
//   - Email modal: select type, write message, send via /api/hr/email/:applicationId
//   - Interview modal: set date+time+message, creates via /api/interviews
//
// ACCESS: Protected — HR users only.
// ============================================================

import React, { useState, useEffect } from 'react';
// useParams: reads :jobId from the URL /hr/jobs/:jobId/applicants
// Link: React Router's <a> tag
// useNavigate: for the "Back to Jobs" button
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { SectionLoader, InlineLoader } from '../../components/Loader';

// ── Date Formatter ────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ── Application Status Options ────────────────────────────────
// Used to populate the status change dropdown for each applicant.
// The 'value' is sent to the API; 'label' is shown in the UI.
const STATUS_OPTIONS = [
  { value: 'submitted',           label: 'Submitted' },
  { value: 'under_review',        label: 'Under Review' },
  { value: 'shortlisted',         label: 'Shortlisted' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'rejected',            label: 'Rejected' },
  { value: 'selected',            label: 'Selected' },
];

// ============================================================
// JobApplicants — Main Component
// ============================================================
const JobApplicants = () => {
  // useParams() extracts :jobId from the current URL
  const { jobId } = useParams();
  const navigate = useNavigate();

  // ── Core Data State ───────────────────────────────────────────
  const [job, setJob] = useState(null);             // Job object (for the title in the header)
  const [applicants, setApplicants] = useState([]); // Array of application objects
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // updatingStatus: holds the ID of the application whose status is being updated.
  // This allows us to show a spinner only on THAT row's dropdown.
  const [updatingStatus, setUpdatingStatus] = useState(null);

  // ── Email Modal State ─────────────────────────────────────────
  // emailModal.open controls visibility; applicationId and candidateName are for display
  const [emailModal, setEmailModal] = useState({ open: false, applicationId: null, candidateName: '' });
  const [emailForm, setEmailForm] = useState({ type: 'custom', message: '', scheduledDate: '', scheduledTime: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState({ type: '', text: '' }); // Feedback: success/error

  // ── Interview Modal State ─────────────────────────────────────
  const [interviewModal, setInterviewModal] = useState({ open: false, applicationId: null, candidateName: '' });
  const [interviewForm, setInterviewForm] = useState({ scheduledDate: '', scheduledTime: '', message: '' });
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [interviewMsg, setInterviewMsg] = useState({ type: '', text: '' });

  // Fetch when the component mounts (or if jobId changes)
  useEffect(() => {
    fetchJobAndApplicants();
  }, [jobId]); // Re-run if jobId in the URL changes

  const fetchJobAndApplicants = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch both the job details and its applicants AT THE SAME TIME (parallel)
      // Promise.all waits for both to complete before proceeding
      const [jobRes, applicantsRes] = await Promise.all([
        api.get(`/api/jobs/${jobId}`),
        api.get(`/api/applications/job/${jobId}`),
      ]);

      if (jobRes.data.success) setJob(jobRes.data.data);
      if (applicantsRes.data.success) setApplicants(applicantsRes.data.data);
    } catch (err) {
      setError('Failed to load applicants.');
    } finally {
      setLoading(false);
    }
  };

  // ── Update Application Status (inline dropdown) ───────────────
  const handleStatusChange = async (applicationId, newStatus) => {
    setUpdatingStatus(applicationId); // Show spinner on this row
    try {
      const res = await api.put(`/api/applications/${applicationId}/status`, { status: newStatus });
      if (res.data.success) {
        // Optimistic update: modify only the changed application in local state
        // This avoids re-fetching all applicants from the server
        setApplicants(prev =>
          prev.map(app =>
            app._id === applicationId
              ? { ...app, status: newStatus } // Replace only this app's status
              : app                           // Leave all others unchanged
          )
        );
      } else {
        alert('Failed to update status.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(null); // Remove spinner
    }
  };

  // ── Email Modal Handlers ──────────────────────────────────────

  const openEmailModal = (applicationId, candidateName) => {
    setEmailModal({ open: true, applicationId, candidateName });
    // Reset the email form each time the modal opens
    setEmailForm({ type: 'custom', message: '', scheduledDate: '', scheduledTime: '' });
    setEmailMsg({ type: '', text: '' });
  };

  const closeEmailModal = () => {
    setEmailModal({ open: false, applicationId: null, candidateName: '' });
  };

  const handleSendEmail = async () => {
    setEmailMsg({ type: '', text: '' });

    // Validation: type is always required
    if (!emailForm.type) {
      setEmailMsg({ type: 'error', text: 'Please select an email type.' });
      return;
    }

    // Extra validation for interview type: date and time are required
    if (emailForm.type === 'interview' && (!emailForm.scheduledDate || !emailForm.scheduledTime)) {
      setEmailMsg({ type: 'error', text: 'Please provide date and time for the interview.' });
      return;
    }

    setSendingEmail(true);
    try {
      const payload = {
        type: emailForm.type,
        message: emailForm.message,
      };

      // Only include interview fields when the email type is 'interview'
      if (emailForm.type === 'interview') {
        payload.scheduledDate = emailForm.scheduledDate;
        payload.scheduledTime = emailForm.scheduledTime;
      }

      const res = await api.post(`/api/hr/email/${emailModal.applicationId}`, payload);
      if (res.data.success) {
        setEmailMsg({ type: 'success', text: 'Email sent successfully!' });
        // Auto-close the modal after 1.5 seconds so the user sees the success message
        setTimeout(closeEmailModal, 1500);
      } else {
        setEmailMsg({ type: 'error', text: res.data.message || 'Failed to send email.' });
      }
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  // ── Interview Modal Handlers ──────────────────────────────────

  const openInterviewModal = (applicationId, candidateName) => {
    setInterviewModal({ open: true, applicationId, candidateName });
    setInterviewForm({ scheduledDate: '', scheduledTime: '', message: '' });
    setInterviewMsg({ type: '', text: '' });
  };

  const closeInterviewModal = () => {
    setInterviewModal({ open: false, applicationId: null, candidateName: '' });
  };

  const handleScheduleInterview = async () => {
    setInterviewMsg({ type: '', text: '' });

    // Both date and time are required
    if (!interviewForm.scheduledDate) {
      setInterviewMsg({ type: 'error', text: 'Please select a date.' });
      return;
    }
    if (!interviewForm.scheduledTime) {
      setInterviewMsg({ type: 'error', text: 'Please select a time.' });
      return;
    }

    setSchedulingInterview(true);
    try {
      const res = await api.post('/api/interviews', {
        applicationId: interviewModal.applicationId,
        scheduledDate: interviewForm.scheduledDate,
        scheduledTime: interviewForm.scheduledTime,
        message: interviewForm.message,
      });

      if (res.data.success) {
        setInterviewMsg({ type: 'success', text: 'Interview scheduled successfully!' });
        // Also update the application's status to 'interview_scheduled' automatically
        handleStatusChange(interviewModal.applicationId, 'interview_scheduled');
        setTimeout(closeInterviewModal, 1500);
      } else {
        setInterviewMsg({ type: 'error', text: res.data.message || 'Failed to schedule interview.' });
      }
    } catch (err) {
      setInterviewMsg({ type: 'error', text: err.response?.data?.message || 'Failed to schedule interview.' });
    } finally {
      setSchedulingInterview(false);
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div className="container">
          {/* Back button navigates to the jobs list */}
          <button
            onClick={() => navigate('/hr/jobs')}
            className="btn btn-outline btn-sm"
            style={{ marginBottom: '12px' }}
          >
            ← Back to Jobs
          </button>
          {/* Title includes the job name if available */}
          <h1>Applicants {job ? `— ${job.title}` : ''}</h1>
          <p>
            {/* Subtitle: branch · department · count */}
            {job?.branch?.name && `${job.branch.name} · `}
            {job?.department && `${job.department} · `}
            {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="container">
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <SectionLoader message="Loading applicants..." />
        ) : applicants.length === 0 ? (
          // Empty state
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>No Applicants Yet</h3>
              <p>No one has applied for this job yet. Share the listing to attract candidates.</p>
              <Link to={`/jobs/${jobId}`} className="btn btn-outline" style={{ marginTop: '12px' }}>
                View Job Listing
              </Link>
            </div>
          </div>
        ) : (
          // Applicants table
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Contact</th>
                    <th>Applied</th>
                    <th>Documents</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((app) => (
                    <tr key={app._id}>

                      {/* Candidate Name + Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Circular avatar: shows profile picture or first initial */}
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            color: 'var(--primary)',
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}>
                            {app.candidate?.profilePic ? (
                              <img
                                src={app.candidate.profilePic}
                                alt={app.candidate.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              // First letter of candidate's name as fallback avatar
                              app.candidate?.name?.charAt(0).toUpperCase() || '?'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>
                              {app.candidate?.name || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {app.candidate?.email}
                        </div>
                        {/* Phone is optional — only render if it exists */}
                        {app.candidate?.phone && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {app.candidate.phone}
                          </div>
                        )}
                      </td>

                      {/* Application Date */}
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {formatDate(app.createdAt || app.appliedAt)}
                      </td>

                      {/* Document Links */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Resume link — opens PDF in a new tab */}
                          {app.candidate?.resume ? (
                            <a
                              href={app.candidate.resume}
                              target="_blank"
                              rel="noopener noreferrer" // Security: new tab can't access parent window
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                            >
                              📄 Resume
                            </a>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No resume</span>
                          )}

                          {/* Cover letter link — only shown if it exists */}
                          {app.candidate?.coverLetter && (
                            <a
                              href={app.candidate.coverLetter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                            >
                              📝 Cover Letter
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Inline Status Dropdown */}
                      <td>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {/* The dropdown value is controlled by app.status */}
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app._id, e.target.value)}
                            // Disable while this application's status is being updated
                            disabled={updatingStatus === app._id}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1.5px solid var(--border)',
                              fontSize: '13px',
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                              background: 'var(--surface)',
                              fontWeight: '500',
                            }}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {/* Inline spinner shown only for this specific application's row */}
                          {updatingStatus === app._id && <InlineLoader />}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Opens the email modal for this applicant */}
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEmailModal(app._id, app.candidate?.name)}
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                          >
                            ✉️ Email
                          </button>
                          {/* Opens the interview scheduling modal for this applicant */}
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => openInterviewModal(app._id, app.candidate?.name)}
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                          >
                            📅 Interview
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          SEND EMAIL MODAL
          ============================================================ */}
      {emailModal.open && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) closeEmailModal(); }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Send Email — {emailModal.candidateName}</h2>
              <button className="modal-close" onClick={closeEmailModal}>×</button>
            </div>
            <div className="modal-body">
              {emailMsg.text && (
                <div className={`alert alert-${emailMsg.type}`}>{emailMsg.text}</div>
              )}

              {/* Email Type Selector */}
              <div className="form-group">
                <label className="form-label">Email Type *</label>
                <select
                  className="form-select"
                  value={emailForm.type}
                  // Spread update pattern: copy all fields, override just 'type'
                  onChange={(e) => setEmailForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="shortlist">Shortlist Notification</option>
                  <option value="interview">Interview Invitation</option>
                  <option value="rejection">Rejection Letter</option>
                  <option value="custom">Custom Message</option>
                </select>
              </div>

              {/* Extra date/time fields — only shown when email type is 'interview' */}
              {emailForm.type === 'interview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Interview Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={emailForm.scheduledDate}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      // min prevents selecting a past date
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interview Time *</label>
                    <input
                      type="time"
                      className="form-input"
                      value={emailForm.scheduledTime}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Message textarea — placeholder changes based on email type */}
              <div className="form-group">
                <label className="form-label">
                  {emailForm.type === 'custom' ? 'Message *' : 'Additional Message (Optional)'}
                </label>
                <textarea
                  className="form-textarea"
                  value={emailForm.message}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={
                    emailForm.type === 'shortlist'  ? 'Congratulations! We are pleased to inform you...' :
                    emailForm.type === 'interview'  ? 'Please join us for the interview. Here are the details...' :
                    emailForm.type === 'rejection'  ? 'Thank you for applying. After careful consideration...' :
                    'Type your custom message here...'
                  }
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeEmailModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendEmail} disabled={sendingEmail}>
                {sendingEmail ? <><InlineLoader /> Sending...</> : '✉️ Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SCHEDULE INTERVIEW MODAL
          ============================================================ */}
      {interviewModal.open && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) closeInterviewModal(); }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Schedule Interview — {interviewModal.candidateName}</h2>
              <button className="modal-close" onClick={closeInterviewModal}>×</button>
            </div>
            <div className="modal-body">
              {interviewMsg.text && (
                <div className={`alert alert-${interviewMsg.type}`}>{interviewMsg.text}</div>
              )}

              {/* Date and time in a two-column grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Interview Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={interviewForm.scheduledDate}
                    onChange={(e) => setInterviewForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]} // Disallow past dates
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Interview Time *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={interviewForm.scheduledTime}
                    onChange={(e) => setInterviewForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  />
                </div>
              </div>

              {/* Optional message to the candidate */}
              <div className="form-group">
                <label className="form-label">Message to Candidate</label>
                <textarea
                  className="form-textarea"
                  value={interviewForm.message}
                  onChange={(e) => setInterviewForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Please prepare for the interview. We look forward to meeting you..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeInterviewModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleScheduleInterview} disabled={schedulingInterview}>
                {schedulingInterview ? <><InlineLoader /> Scheduling...</> : '📅 Schedule Interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapse the date+time grid to single column on very small screens */}
      <style>{`
        @media (max-width: 480px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default JobApplicants;
