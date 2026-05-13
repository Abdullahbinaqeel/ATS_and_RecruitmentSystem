// ============================================================
// pages/hr/ManageBranches.jsx — HR Branch Location Management
//
// HR can:
//   - View all branch locations in two formats (card grid + table)
//   - Add a new branch via a modal form
//   - Edit an existing branch (same modal, pre-filled)
//   - Delete a branch (with confirmation)
//
// BRANCHES are the office locations where jobs are posted.
// Each job is assigned to one branch (e.g., "Islamabad HQ").
//
// API CALLS:
//   GET    /api/branches        — list all branches
//   POST   /api/branches        — create a new branch
//   PUT    /api/branches/:id    — update a branch
//   DELETE /api/branches/:id    — delete a branch
//
// ACCESS: Protected — HR users only.
// ============================================================

import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { SectionLoader, InlineLoader } from '../../components/Loader';

// ── Empty Form Template ───────────────────────────────────────
// Used to reset the form each time the "Add Branch" modal opens.
const EMPTY_FORM = {
  name: '',
  city: '',
  address: '',
};

// ============================================================
// ManageBranches — Main Component
// ============================================================
const ManageBranches = () => {
  // ── State ─────────────────────────────────────────────────────
  const [branches, setBranches] = useState([]);   // Array of branch objects
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  // editingBranch: null = adding, object = editing
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // successMsg: shown briefly after a successful create/update/delete
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch branches on mount
  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/branches');
      if (res.data.success) {
        setBranches(res.data.data);
      } else {
        setError('Failed to load branches.');
      }
    } catch (err) {
      setError('Unable to fetch branches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Open Modal for ADDING ─────────────────────────────────────
  const openAddModal = () => {
    setEditingBranch(null);   // null = we're adding a new branch
    setFormData(EMPTY_FORM);  // Reset form to blank
    setFormError('');
    setModalOpen(true);
  };

  // ── Open Modal for EDITING ────────────────────────────────────
  // Pre-fills the form with the selected branch's current data
  const openEditModal = (branch) => {
    setEditingBranch(branch); // Store reference so we know to use PUT later
    setFormData({
      name: branch.name || '',
      city: branch.city || '',
      address: branch.address || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // Close modal and reset all modal-related state
  const closeModal = () => {
    setModalOpen(false);
    setEditingBranch(null);
    setFormData(EMPTY_FORM);
    setFormError('');
  };

  // Handle any form field change — works for name, city, and address
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Spread operator (...prev) copies all fields; we only override the changed one
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Save Branch (Create or Update) ───────────────────────────
  const handleSave = async () => {
    setFormError('');

    // Frontend validation — give instant feedback
    if (!formData.name.trim()) {
      setFormError('Branch name is required.');
      return;
    }
    if (!formData.city.trim()) {
      setFormError('City is required.');
      return;
    }

    setSaving(true);
    try {
      let res;
      if (editingBranch) {
        // Editing: PUT request with the branch's ID in the URL
        res = await api.put(`/api/branches/${editingBranch._id}`, formData);
      } else {
        // Adding new: POST request
        res = await api.post('/api/branches', formData);
      }

      if (res.data.success) {
        closeModal();
        fetchBranches(); // Reload the full list to reflect changes
        // Show a brief success message, then auto-clear it after 3 seconds
        setSuccessMsg(editingBranch ? 'Branch updated successfully!' : 'Branch created successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setFormError(res.data.message || 'Failed to save branch.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save branch.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete a Branch ───────────────────────────────────────────
  const handleDelete = async (branchId, branchName) => {
    // Confirm with the user before permanently deleting
    if (!window.confirm(`Delete branch "${branchName}"? Any jobs associated with this branch may be affected.`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/branches/${branchId}`);
      if (res.data.success) {
        // Optimistic update: remove from local state immediately instead of re-fetching
        setBranches(prev => prev.filter(b => b._id !== branchId));
        setSuccessMsg('Branch deleted successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        alert('Failed to delete branch.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete branch.');
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1>Manage Branches</h1>
              <p>Add and manage your organization's branch locations</p>
            </div>
            <button className="btn btn-primary" onClick={openAddModal}>
              + Add Branch
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Success message — fades out after 3 seconds (handled by setTimeout above) */}
        {successMsg && (
          <div className="alert alert-success">{successMsg}</div>
        )}

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {loading ? (
          <SectionLoader message="Loading branches..." />
        ) : branches.length === 0 ? (
          // Empty state with prompt to add first branch
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <h3>No Branches Yet</h3>
              <p>Add your first branch location to start posting jobs.</p>
              <button className="btn btn-primary" onClick={openAddModal} style={{ marginTop: '12px' }}>
                + Add First Branch
              </button>
            </div>
          </div>
        ) : (
          // ── Branch Card Grid ────────────────────────────────
          // auto-fill creates as many columns as fit at 280px minimum
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {branches.map((branch) => (
              // BranchCard is defined below — receives the branch data and action callbacks
              <BranchCard
                key={branch._id}
                branch={branch}
                onEdit={() => openEditModal(branch)}
                onDelete={() => handleDelete(branch._id, branch.name)}
              />
            ))}
          </div>
        )}

        {/* ── Branch Table (shown when there are branches) ────── */}
        {/* Shows the same data in a table format below the card grid */}
        {!loading && branches.length > 0 && (
          <div className="card" style={{ marginTop: '28px', padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: '700', fontSize: '16px' }}>All Branches — Table View</h3>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Branch Name</th>
                    <th>City</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* index gives us a row number for the "#" column */}
                  {branches.map((branch, index) => (
                    <tr key={branch._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{branch.name}</div>
                      </td>
                      <td style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {/* '—' shown when city is empty (optional field) */}
                        {branch.city || '—'}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '200px' }}>
                        {/* Truncate long addresses with ellipsis */}
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {branch.address || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(branch)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(branch._id, branch.name)}
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
          ADD / EDIT BRANCH MODAL
          ============================================================ */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          // Close when clicking the dark overlay (outside the modal box)
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {/* Title changes based on mode */}
                {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Add New Branch'}
              </h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              {formError && (
                <div className="alert alert-error">{formError}</div>
              )}

              {/* Branch Name — required */}
              <div className="form-group">
                <label className="form-label">Branch Name *</label>
                <input
                  name="name"        // Must match the key in EMPTY_FORM and handleChange
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Karachi Main Office"
                />
              </div>

              {/* City — required */}
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  name="city"
                  type="text"
                  className="form-input"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g., Karachi"
                />
              </div>

              {/* Full Address — optional */}
              <div className="form-group">
                <label className="form-label">Full Address</label>
                <textarea
                  name="address"
                  className="form-textarea"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g., Floor 5, Business Tower, Shahrah-e-Faisal, Karachi"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Footer: Cancel + Save buttons */}
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><InlineLoader /> Saving...</>
                  // Button label changes between add and edit modes
                  : editingBranch ? 'Update Branch' : 'Add Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// BranchCard — Card View for a Single Branch
//
// A presentational component that receives the branch data and
// two callback functions (onEdit, onDelete) from the parent.
// Callbacks are used instead of passing the whole state down,
// because the card shouldn't know about the parent's modal logic.
//
// Props:
//   branch   — branch object { name, city, address, _id }
//   onEdit   — function to call when Edit is clicked
//   onDelete — function to call when Delete is clicked
// ============================================================
const BranchCard = ({ branch, onEdit, onDelete }) => (
  <div style={{
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    padding: '24px',
    transition: 'var(--transition)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  }}
  // Hover: blue border + shadow
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
    e.currentTarget.style.borderColor = 'var(--primary)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.borderColor = 'var(--border)';
  }}
  >
    {/* Branch icon + name/city */}
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      {/* Building emoji in a colored square */}
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--primary-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        flexShrink: 0, // Don't shrink the icon when text is long
      }}>
        🏢
      </div>
      <div>
        <h3 style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {branch.name}
        </h3>
        {/* Only show city if it's not empty */}
        {branch.city && (
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            📍 {branch.city}
          </div>
        )}
      </div>
    </div>

    {/* Address — only shown if it exists */}
    {branch.address && (
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
        {branch.address}
      </p>
    )}

    {/* Action buttons — flex: 1 makes both buttons equal width */}
    {/* marginTop: 'auto' pushes buttons to the bottom of the card */}
    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
      <button className="btn btn-outline btn-sm" onClick={onEdit} style={{ flex: 1, justifyContent: 'center' }}>
        Edit
      </button>
      <button className="btn btn-danger btn-sm" onClick={onDelete} style={{ flex: 1, justifyContent: 'center' }}>
        Delete
      </button>
    </div>
  </div>
);

export default ManageBranches;
