// ============================================================
// pages/candidate/Profile.jsx — Candidate Profile Management
//
// Lets a candidate view and update their personal information
// and upload documents required for job applications.
//
// LAYOUT: Two-column grid
//   LEFT  — Profile picture card + email/role info
//   RIGHT — Personal info form + Documents section
//
// FORM ACTIONS:
//   PUT  /api/auth/profile              — save name, phone, address
//   POST /api/auth/upload/profile-pic   — upload profile image
//   POST /api/auth/upload/resume        — upload resume PDF
//   POST /api/auth/upload/cover-letter  — upload cover letter PDF
//
// FILE UPLOADS:
//   Files are sent using FormData (multipart/form-data), NOT JSON.
//   The browser handles encoding the file data.
//   useRef() is used to programmatically "click" hidden file inputs.
//
// ACCESS: Protected — only candidates can see this page.
// ============================================================

import React, { useState, useRef } from 'react';
import api from '../../api/axios';
// useAuth gives us user data and updateUser() to refresh it after changes
import { useAuth } from '../../context/AuthContext';
import { InlineLoader } from '../../components/Loader';

const CandidateProfile = () => {
  const { user, updateUser } = useAuth();

  // ── Profile Form State ────────────────────────────────────────
  // Pre-fill the form with existing user data.
  // user?.name uses optional chaining to safely access name even if user is null
  // || '' provides empty string fallback if the field is undefined
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  // ── Loading States ────────────────────────────────────────────
  // We have SEPARATE loading states for each action so that
  // each button independently shows its own spinner
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingCoverLetter, setUploadingCoverLetter] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);

  // ── Feedback Messages ─────────────────────────────────────────
  // Each section has its own feedback area (success/error).
  // { type: 'success'|'error', text: '...' }
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [resumeMsg, setResumeMsg] = useState({ type: '', text: '' });
  const [coverLetterMsg, setCoverLetterMsg] = useState({ type: '', text: '' });
  const [picMsg, setPicMsg] = useState({ type: '', text: '' });

  // Preview URL for newly selected profile picture (before upload)
  const [picPreview, setPicPreview] = useState(user?.profilePic || null);

  // ── Refs for Hidden File Inputs ───────────────────────────────
  // useRef() creates a reference to a DOM element.
  // We use this to programmatically trigger the file picker dialog
  // when the user clicks a custom-styled button (instead of the ugly default input).
  const resumeInputRef = useRef();
  const coverLetterInputRef = useRef();
  const picInputRef = useRef();

  // Handle profile text field changes (name, phone, address)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ============================================================
  // Save Profile Info (name, phone, address)
  // Sends a PUT request to update the user's profile fields
  // ============================================================
  const handleSaveProfile = async (e) => {
    e.preventDefault(); // Prevent default form submit (page reload)
    setProfileMsg({ type: '', text: '' });

    // Basic validation
    if (!formData.name.trim()) {
      setProfileMsg({ type: 'error', text: 'Name is required.' });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.put('/api/auth/profile', {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      });

      if (res.data.success) {
        // updateUser() updates the global AuthContext user state
        // so the navbar avatar and other places reflect the new name immediately
        updateUser(res.data.data);
        setProfileMsg({ type: 'success', text: 'Profile saved successfully!' });
      } else {
        setProfileMsg({ type: 'error', text: res.data.message || 'Failed to save profile.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // ============================================================
  // Upload Profile Picture
  //
  // WHY FORMDATA?
  // Regular JSON can't carry binary file data.
  // FormData is the standard way to send files in HTTP requests.
  // The Content-Type header must be 'multipart/form-data' for files.
  // ============================================================
  const handlePicUpload = async (e) => {
    // e.target.files[0] is the first selected file from the file input
    const file = e.target.files[0];
    if (!file) return;

    // Create a temporary local URL to show a preview BEFORE uploading.
    // URL.createObjectURL() creates a blob URL for the file without uploading.
    const previewUrl = URL.createObjectURL(file);
    setPicPreview(previewUrl);
    setPicMsg({ type: '', text: '' });

    // FormData: special object for sending files in HTTP requests
    const formDataObj = new FormData();
    // append('fieldName', file) — 'profilePic' is what the backend expects
    formDataObj.append('profilePic', file);

    setUploadingPic(true);
    try {
      // Override Content-Type for this specific request (not JSON)
      const res = await api.post('/api/auth/upload/profile-pic', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        updateUser(res.data.data); // Refresh global user state with new profilePic URL
        setPicMsg({ type: 'success', text: 'Profile picture updated!' });
      } else {
        setPicMsg({ type: 'error', text: 'Upload failed.' });
      }
    } catch (err) {
      setPicMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally {
      setUploadingPic(false);
    }
  };

  // ============================================================
  // Upload Resume (PDF only)
  // ============================================================
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type on the frontend (server also validates)
    if (file.type !== 'application/pdf') {
      setResumeMsg({ type: 'error', text: 'Please select a PDF file.' });
      return;
    }

    setResumeMsg({ type: '', text: '' });
    const formDataObj = new FormData();
    formDataObj.append('resume', file); // 'resume' matches the backend field name

    setUploadingResume(true);
    try {
      const res = await api.post('/api/auth/upload/resume', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        updateUser(res.data.data); // Update user.resume URL in global state
        setResumeMsg({ type: 'success', text: 'Resume uploaded successfully!' });
      } else {
        setResumeMsg({ type: 'error', text: 'Upload failed.' });
      }
    } catch (err) {
      setResumeMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally {
      setUploadingResume(false);
    }
  };

  // ============================================================
  // Upload Cover Letter (PDF only)
  // ============================================================
  const handleCoverLetterUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setCoverLetterMsg({ type: 'error', text: 'Please select a PDF file.' });
      return;
    }

    setCoverLetterMsg({ type: '', text: '' });
    const formDataObj = new FormData();
    formDataObj.append('coverLetter', file);

    setUploadingCoverLetter(true);
    try {
      const res = await api.post('/api/auth/upload/cover-letter', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        updateUser(res.data.data);
        setCoverLetterMsg({ type: 'success', text: 'Cover letter uploaded successfully!' });
      } else {
        setCoverLetterMsg({ type: 'error', text: 'Upload failed.' });
      }
    } catch (err) {
      setCoverLetterMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally {
      setUploadingCoverLetter(false);
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div className="container">
          <h1>My Profile</h1>
          <p>Manage your personal information and documents</p>
        </div>
      </div>

      <div className="container">
        {/* Two-column layout: narrow left, wider right */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '28px',
          alignItems: 'start', // Don't stretch cards to equal height
        }}>

          {/* ── LEFT COLUMN ──────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Profile Picture Card */}
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '16px' }}>
                Profile Picture
              </h3>

              {/* Clickable circular avatar */}
              <div
                onClick={() => picInputRef.current.click()} // Trigger the hidden file input
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  overflow: 'hidden',   // Clip the image to the circle
                  margin: '0 auto 16px',
                  cursor: 'pointer',
                  border: '3px solid var(--primary)',
                  position: 'relative',
                  background: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {picPreview ? (
                  // Show uploaded/previewed image
                  <img
                    src={picPreview}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  // Default: first letter of the user's name as avatar text
                  <span style={{
                    fontSize: '42px',
                    fontWeight: '800',
                    color: 'var(--primary)',
                  }}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}

                {/* Camera hover overlay — appears when mouse is over the circle */}
                <div style={{
                  position: 'absolute',
                  inset: 0, // shorthand for top/right/bottom/left = 0 (fills the parent)
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  fontSize: '24px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
                >
                  📷
                </div>
              </div>

              {/* Hidden file input for profile picture */}
              {/* ref={picInputRef} lets us call picInputRef.current.click() programmatically */}
              <input
                ref={picInputRef}
                type="file"
                accept="image/*" // Only allow image files in the file picker
                style={{ display: 'none' }} // Hidden — we use a custom button instead
                onChange={handlePicUpload}
              />

              <button
                className="btn btn-outline btn-sm"
                onClick={() => picInputRef.current.click()} // Open the file picker
                disabled={uploadingPic}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {uploadingPic ? <><InlineLoader /> Uploading...</> : '📷 Change Photo'}
              </button>

              {/* Feedback message for pic upload */}
              {picMsg.text && (
                <div className={`alert alert-${picMsg.type}`} style={{ marginTop: '10px', fontSize: '13px' }}>
                  {picMsg.text}
                </div>
              )}

              {/* Read-only user info below the picture */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', textAlign: 'left' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Email</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {user?.email}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', marginBottom: '2px' }}>Role</div>
                <div style={{ textTransform: 'capitalize' }}>
                  <span className="badge badge-submitted">
                    {user?.role === 'candidate' ? 'Job Seeker' : 'HR Recruiter'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Personal Information Form */}
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '18px' }}>
                Personal Information
              </h3>

              {/* Profile save feedback */}
              {profileMsg.text && (
                <div className={`alert alert-${profileMsg.type}`}>{profileMsg.text}</div>
              )}

              <form onSubmit={handleSaveProfile}>
                {/* Two-column grid inside the form */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                  {/* Full Name — spans both columns (gridColumn: '1 / -1') */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Full Name *</label>
                    <input
                      name="name"
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                    />
                  </div>

                  {/* Email — read-only, can't be changed */}
                  <div className="form-group">
                    <label className="form-label">
                      Email Address
                      {/* Visual note that email can't be changed */}
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>
                        (cannot be changed)
                      </span>
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={user?.email || ''}
                      readOnly          // HTML attribute: makes field non-editable
                      style={{ background: 'var(--bg)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                    />
                  </div>

                  {/* Phone */}
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      name="phone"
                      type="tel" // Hints mobile browsers to show a phone keypad
                      className="form-input"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  {/* Address — spans both columns */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Address</label>
                    <textarea
                      name="address"
                      className="form-textarea"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Your address"
                      rows={3}
                      style={{ resize: 'none' }} // Prevent user from resizing the textarea
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProfile}
                >
                  {savingProfile ? <><InlineLoader /> Saving...</> : '💾 Save Profile'}
                </button>
              </form>
            </div>

            {/* Documents Card */}
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '18px' }}>
                Documents
              </h3>

              {/* ── Resume Section ──────────────────────────── */}
              <div style={{
                padding: '20px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>📄</span>
                    <div>
                      <div style={{ fontWeight: '700', marginBottom: '2px' }}>Resume</div>
                      {user?.resume ? (
                        // Show a link to the current resume
                        <a
                          href={user.resume}
                          target="_blank"
                          rel="noopener noreferrer" // Security best practice for external links
                          style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}
                        >
                          View current resume ↗
                        </a>
                      ) : (
                        // Warning: resume is required to apply for jobs
                        <span style={{ fontSize: '13px', color: 'var(--danger)' }}>
                          No resume uploaded — required to apply for jobs!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hidden file input for resume */}
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf" // Only allow PDF files
                    style={{ display: 'none' }}
                    onChange={handleResumeUpload}
                  />

                  {/* Custom upload button — triggers the hidden input */}
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => resumeInputRef.current.click()}
                    disabled={uploadingResume}
                  >
                    {uploadingResume
                      ? <><InlineLoader /> Uploading...</>
                      // Button label changes based on whether resume already exists
                      : user?.resume ? '📤 Update Resume' : '📤 Upload Resume'}
                  </button>
                </div>

                {resumeMsg.text && (
                  <div className={`alert alert-${resumeMsg.type}`} style={{ marginTop: '10px', fontSize: '13px' }}>
                    {resumeMsg.text}
                  </div>
                )}

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  PDF format only. Max file size: 5MB.
                </p>
              </div>

              {/* ── Cover Letter Section ────────────────────── */}
              <div style={{
                padding: '20px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>📝</span>
                    <div>
                      <div style={{ fontWeight: '700', marginBottom: '2px' }}>Cover Letter</div>
                      {user?.coverLetter ? (
                        <a
                          href={user.coverLetter}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}
                        >
                          View current cover letter ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          No cover letter uploaded (optional)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hidden file input for cover letter */}
                  <input
                    ref={coverLetterInputRef}
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={handleCoverLetterUpload}
                  />

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => coverLetterInputRef.current.click()}
                    disabled={uploadingCoverLetter}
                  >
                    {uploadingCoverLetter
                      ? <><InlineLoader /> Uploading...</>
                      : user?.coverLetter ? '📤 Update Cover Letter' : '📤 Upload Cover Letter'}
                  </button>
                </div>

                {coverLetterMsg.text && (
                  <div className={`alert alert-${coverLetterMsg.type}`} style={{ marginTop: '10px', fontSize: '13px' }}>
                    {coverLetterMsg.text}
                  </div>
                )}

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  PDF format only. Optional but recommended.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stack columns on mobile screens */}
        <style>{`
          @media (max-width: 768px) {
            div[style*="grid-template-columns: 1fr 2fr"] {
              grid-template-columns: 1fr !important;
            }
            div[style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CandidateProfile;
