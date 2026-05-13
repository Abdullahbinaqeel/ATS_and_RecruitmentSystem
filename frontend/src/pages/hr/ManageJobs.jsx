// ============================================================
// pages/hr/ManageJobs.jsx — HR Job Listings Management
//
// HR can:
//   - See ALL jobs in a table
//   - Create a new job via a modal form
//   - Edit an existing job (same modal, pre-filled)
//   - Delete a job (with confirmation)
//   - Navigate to view applicants for a job
//
// MODAL BEHAVIOR:
//   - One modal is used for BOTH add and edit actions.
//   - When editingJob is null → form is empty (adding new)
//   - When editingJob is an object → form is pre-filled (editing)
//
// REQUIREMENTS LIST:
//   - The job form has a dynamic requirements list
//   - Users can add new requirement fields or remove existing ones
//
// API CALLS:
//   GET    /api/jobs         — load all jobs
//   POST   /api/jobs         — create new job
//   PUT    /api/jobs/:id     — update existing job
//   DELETE /api/jobs/:id     — delete a job
//   GET    /api/branches     — populate branch dropdown in the form
//
// ACCESS: Protected — HR users only.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { SectionLoader, InlineLoader } from '../../components/Loader';

// ── Department Options ────────────────────────────────────────
// Must match the backend's allowed values for the department field
const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];

// ── Empty Form Template ───────────────────────────────────────
// Used to reset the form when opening the "Add New Job" modal.
// requirements starts with [''] so there's always at least one input field.
const EMPTY_FORM = {
  title: '',
  department: '',
  description: '',
  requirements: [''],
  branch: '',
  seats: 1,
  status: 'open',
};

// ── Date Formatter ────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ============================================================
// ManageJobs — Main Component
// ============================================================
const ManageJobs = () => {
  // ── State Variables ───────────────────────────────────────────
  const [jobs, setJobs] = useState([]);         // All jobs from the API
  const [branches, setBranches] = useState([]);  // For the branch dropdown in the form
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  // editingJob: null = adding a new job; object = the job being edited
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false); // True while save request is in progress

  // Fetch data on first render
  useEffect(() => {
    fetchJobs();
    fetchBranches();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/jobs');
      if (res.data.success) setJobs(res.data.data);
    } catch (err) {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/branches');
      if (res.data.success) setBranches(res.data.data);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  // ── Open Modal for ADDING a New Job ──────────────────────────
  const openAddModal = () => {
    setEditingJob(null);          // null = we're adding (not editing)
    setFormData(EMPTY_FORM);      // Reset form to blank
    setFormError('');
    setModalOpen(true);
  };

  // ── Open Modal for EDITING an Existing Job ────────────────────
  // Pre-fills the form with the job's current data so the HR can modify it
  const openEditModal = (job) => {
    setEditingJob(job); // Store the job being edited (used to determine PUT vs POST)
    setFormData({
      title: job.title || '',
      department: job.department || '',
      description: job.description || '',
      // If no requirements, start with one empty field; otherwise load existing ones
      requirements: job.requirements?.length > 0 ? job.requirements : [''],
      // job.branch might be an object (with ._id) or just an ID string
      branch: job.branch?._id || job.branch || '',
      seats: job.seats || 1,
      status: job.status || 'open',
    });
    setFormError('');
    setModalOpen(true);
  };

  // Close the modal and reset everything
  const closeModal = () => {
    setModalOpen(false);
    setEditingJob(null);
    setFormData(EMPTY_FORM);
    setFormError('');
  };

  // Handle changes to any simple form field (title, department, etc.)
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // Spread operator (...prev) copies all existing fields, then overrides just the changed one
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Dynamic Requirements List ─────────────────────────────────

  // Update the text of a requirement at a specific index
  const handleRequirementChange = (index, value) => {
    setFormData(prev => {
      // Spread creates a shallow copy so we don't mutate state directly
      const updated = [...prev.requirements];
      updated[index] = value;
      return { ...prev, requirements: updated };
    });
  };

  // Add a new empty requirement field at the end of the list
  const addRequirement = () => {
    setFormData(prev => ({ ...prev, requirements: [...prev.requirements, ''] }));
  };

  // Remove a requirement at a specific index
  // We never remove the last one — there must always be at least one field
  const removeRequirement = (index) => {
    if (formData.requirements.length === 1) return; // Guard against removing the only field
    setFormData(prev => ({
      ...prev,
      // .filter() creates new array excluding the item at 'index'
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  // ── Save Job (Create or Update) ───────────────────────────────
  const handleSave = async () => {
    setFormError('');

    // Frontend validation — give instant feedback without hitting the server
    if (!formData.title.trim()) { setFormError('Job title is required.'); return; }
    if (!formData.department) { setFormError('Department is required.'); return; }
    if (!formData.description.trim()) { setFormError('Job description is required.'); return; }
    if (!formData.branch) { setFormError('Branch is required.'); return; }
    if (!formData.seats || formData.seats < 1) { setFormError('Seats must be at least 1.'); return; }

    // Filter out empty requirement strings before sending to server
    const requirements = formData.requirements.filter(r => r.trim() !== '');

    // Build the request payload
    const payload = {
      title: formData.title.trim(),
      department: formData.department,
      description: formData.description.trim(),
      requirements,
      branch: formData.branch,
      seats: parseInt(formData.seats), // Ensure it's a number, not a string
      status: formData.status,
    };

    setSaving(true);
    try {
      let res;
      if (editingJob) {
        // Editing: use PUT with the job's ID in the URL
        res = await api.put(`/api/jobs/${editingJob._id}`, payload);
      } else {
        // Adding new: use POST
        res = await api.post('/api/jobs', payload);
      }

      if (res.data.success) {
        closeModal();
        fetchJobs(); // Reload the jobs list to show the new/updated job
      } else {
        setFormError(res.data.message || 'Failed to save job.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save job.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete a Job ──────────────────────────────────────────────
  const handleDelete = async (jobId, jobTitle) => {
    // Ask the user to confirm before permanently deleting
    if (!window.confirm(`Delete "${jobTitle}"? This will also delete all applications for this job. This cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/jobs/${jobId}`);
      if (res.data.success) {
        // Optimistic update: remove from local state instead of re-fetching
        // This feels faster because the UI updates immediately
        setJobs(prev => prev.filter(j => j._id !== jobId));
      } else {
        alert('Failed to delete job.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete job.');
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1>Manage Job Listings</h1>
              <p>Create, edit, and manage all job postings</p>
            </div>
            {/* "Post New Job" opens the add modal */}
            <button className="btn btn-primary" onClick={openAddModal}>
              + Post New Job
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <SectionLoader message="Loading jobs..." />
        ) : jobs.length === 0 ? (
          // Empty state with a prompt to post the first job
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">💼</div>
              <h3>No Jobs Posted Yet</h3>
              <p>Create your first job listing to start receiving applications.</p>
              <button className="btn btn-primary" onClick={openAddModal} style={{ marginTop: '12px' }}>
                + Post First Job
              </button>
            </div>
          </div>
        ) : (
          // Jobs table
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Branch</th>
                    <th>Seats</th>
                    <th>Status</th>
                    <th>Posted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job._id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{job.title}</div>
                      </td>
                      <td style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {job.department}
                      </td>
                      <td style={{ fontSize: '14px' }}>
                        {job.branch?.name || 'N/A'}
                      </td>
                      <td style={{ fontSize: '14px', textAlign: 'center' }}>
                        {job.seats}
                      </td>
                      <td>
                        {/* badge-open or badge-closed from index.css */}
                        <span className={`badge badge-${job.status === 'open' ? 'open' : 'closed'}`}>
                          {job.status === 'open' ? '● Open' : '● Closed'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {formatDate(job.createdAt)}
                      </td>
                      <td>
                        {/* Action buttons for each row */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Navigate to applicants page for this job */}
                          <Link
                            to={`/hr/jobs/${job._id}/applicants`}
                            className="btn btn-outline btn-sm"
                          >
                            Applicants
                          </Link>
                          {/* Opens the edit modal pre-filled with this job's data */}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(job)}
                          >
                            Edit
                          </button>
                          {/* Deletes the job after confirmation */}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(job._id, job.title)}
                          >
                            Delete
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
          ADD / EDIT JOB MODAL
          Only rendered when modalOpen is true.
          ============================================================ */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          // Close the modal when clicking the dark backdrop (not the modal box itself)
          // e.target is the clicked element, e.currentTarget is the backdrop div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="modal modal-lg">

            {/* Modal Header */}
            <div className="modal-header">
              <h2 className="modal-title">
                {/* Title changes based on whether we're adding or editing */}
                {editingJob ? `Edit Job: ${editingJob.title}` : 'Post New Job'}
              </h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            {/* Modal Body: the form */}
            <div className="modal-body">
              {formError && <div className="alert alert-error">{formError}</div>}

              {/* Two-column form grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                {/* Job Title — spans full width (both columns) */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Job Title *</label>
                  <input
                    name="title"
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>

                {/* Department Dropdown */}
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select name="department" className="form-select" value={formData.department} onChange={handleFormChange}>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Branch Dropdown — populated from /api/branches */}
                <div className="form-group">
                  <label className="form-label">Branch *</label>
                  <select name="branch" className="form-select" value={formData.branch} onChange={handleFormChange}>
                    <option value="">Select Branch</option>
                    {/* Each branch has an _id (used as value) and a name (shown to user) */}
                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>

                {/* Number of Seats */}
                <div className="form-group">
                  <label className="form-label">Number of Seats *</label>
                  <input
                    name="seats"
                    type="number"
                    className="form-input"
                    value={formData.seats}
                    onChange={handleFormChange}
                    min={1}
                    max={100}
                  />
                </div>

                {/* Status Dropdown */}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select name="status" className="form-select" value={formData.status} onChange={handleFormChange}>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Job Description — full width textarea */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Job Description *</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Describe the role, responsibilities, and what you're looking for..."
                    rows={5}
                  />
                </div>

                {/* Dynamic Requirements List */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Requirements</label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Add each requirement as a separate item. Click "+" to add more.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Map each requirement to an input row */}
                    {formData.requirements.map((req, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Numbered bullet */}
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                          flexShrink: 0,
                        }}>
                          {index + 1}
                        </span>

                        {/* Requirement text input */}
                        <input
                          type="text"
                          className="form-input"
                          value={req}
                          onChange={(e) => handleRequirementChange(index, e.target.value)}
                          placeholder={`Requirement ${index + 1}`}
                          style={{ flex: 1 }}
                        />

                        {/* Remove button — disabled when there's only one requirement */}
                        <button
                          type="button"
                          onClick={() => removeRequirement(index)}
                          disabled={formData.requirements.length === 1}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: formData.requirements.length === 1 ? 'var(--bg)' : '#FEE2E2',
                            color: formData.requirements.length === 1 ? 'var(--text-muted)' : 'var(--danger)',
                            border: 'none',
                            cursor: formData.requirements.length === 1 ? 'not-allowed' : 'pointer',
                            fontWeight: '700',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* "Add Requirement" button — appends an empty string to the array */}
                  <button
                    type="button"
                    onClick={addRequirement}
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '10px' }}
                  >
                    + Add Requirement
                  </button>
                </div>
              </div>

              {/* Collapse two-column grid on very small screens */}
              <style>{`
                @media (max-width: 480px) {
                  div[style*="grid-template-columns: 1fr 1fr"] {
                    grid-template-columns: 1fr !important;
                  }
                }
              `}</style>
            </div>

            {/* Modal Footer: Cancel + Save buttons */}
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><InlineLoader /> Saving...</>
                  // Button label changes: "Update Job" when editing, "Post Job" when adding
                  : editingJob ? 'Update Job' : 'Post Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageJobs;
