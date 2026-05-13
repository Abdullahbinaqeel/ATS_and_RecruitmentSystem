// ============================================================
// pages/Jobs.jsx — Browse All Job Listings
//
// This page shows ALL jobs from the database with filtering.
//
// FILTERS AVAILABLE:
//   - Search text  — partial match on job title/keywords (debounced)
//   - Branch       — filter by office location (fetched from /api/branches)
//   - Department   — filter by department (hardcoded list)
//   - Status       — Open / Closed / All
//
// DEBOUNCING EXPLAINED:
//   When the user types in the search box, we DON'T send an API request
//   on every single keypress (that would be too many requests).
//   Instead, we wait 500ms after the user STOPS typing, then fetch.
//   This is done with a timer inside useEffect.
//
// LAYOUT:
//   - Responsive grid: 3 columns on desktop, 2 on tablet, 1 on mobile
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import JobCard from '../components/JobCard';
import { SectionLoader } from '../components/Loader';

// ── Department List ───────────────────────────────────────────
// Hardcoded to match the backend's allowed department values.
// This list is used to populate the "Department" filter dropdown.
const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
];

const Jobs = () => {
  // jobs: the array of job objects returned from the API
  const [jobs, setJobs] = useState([]);

  // loading: true while the API request is in progress
  const [loading, setLoading] = useState(true);

  // error: holds an error message if the fetch fails
  const [error, setError] = useState('');

  // branches: list of branch objects from /api/branches (for the dropdown)
  const [branches, setBranches] = useState([]);

  // filters: the LIVE state of all filter inputs (what the user sees typed/selected)
  const [filters, setFilters] = useState({
    search: '',
    branch: '',
    department: '',
    status: '',
  });

  // appliedFilters: the filters actually sent to the API.
  // For search, this is delayed by 500ms (debounce).
  // For dropdowns, this updates immediately (no debounce needed).
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // ── Fetch Branches Once on Mount ─────────────────────────────
  // useEffect with [] runs ONCE when the component is first mounted.
  // We only need branches once — they don't change during filtering.
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/api/branches');
        if (res.data.success) {
          setBranches(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    };
    fetchBranches();
  }, []);

  // ── Debounce: Delay Search Filter Application ─────────────────
  // [filters] means this effect re-runs every time filters changes.
  // Each time filters changes, we:
  //   1. Set a 500ms timer
  //   2. When the timer fires, copy filters → appliedFilters
  //   3. The cleanup function cancels the timer if filters changes AGAIN
  //      before 500ms (i.e., the user typed another character)
  //
  // Result: appliedFilters only updates 500ms after the user stops typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedFilters(filters);
    }, 500);

    // Cleanup: cancel the pending timer when the effect runs again
    return () => clearTimeout(timer);
  }, [filters]);

  // ── Fetch Jobs When Applied Filters Change ────────────────────
  // [appliedFilters] means this runs every time appliedFilters updates.
  // This triggers a new API request whenever the user changes a filter.
  useEffect(() => {
    fetchJobs();
  }, [appliedFilters]);

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      // URLSearchParams builds a query string: ?search=frontend&status=open
      // We only add parameters that have a non-empty value
      const params = new URLSearchParams();
      if (appliedFilters.search)     params.append('search', appliedFilters.search);
      if (appliedFilters.branch)     params.append('branch', appliedFilters.branch);
      if (appliedFilters.department) params.append('department', appliedFilters.department);
      if (appliedFilters.status)     params.append('status', appliedFilters.status);

      // The query string is appended to the URL: /api/jobs?search=...&status=...
      const response = await api.get(`/api/jobs?${params.toString()}`);
      if (response.data.success) {
        setJobs(response.data.data);
      } else {
        setError('Failed to load jobs.');
      }
    } catch (err) {
      setError('Unable to fetch jobs. Please try again.');
      console.error(err);
    } finally {
      // setLoading(false) runs whether the request succeeded or failed
      setLoading(false);
    }
  };

  // ── Handle Filter Changes ─────────────────────────────────────
  // Called when ANY filter input/dropdown changes.
  // For dropdowns (not search), we also update appliedFilters immediately
  // because we don't need the debounce delay for instant dropdown changes.
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    if (field !== 'search') {
      // Non-search filters: apply immediately without waiting for debounce
      setAppliedFilters(prev => ({ ...prev, [field]: value }));
    }
  };

  // ── Clear All Filters ─────────────────────────────────────────
  const handleClearFilters = () => {
    const empty = { search: '', branch: '', department: '', status: '' };
    setFilters(empty);
    setAppliedFilters(empty); // Also clear applied immediately
  };

  // hasActiveFilters: true if ANY filter has a non-empty value
  // Used to decide whether to show the "Clear Filters" button
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div style={{ paddingBottom: '60px' }}>

      {/* ── Page Header Banner ───────────────────────────── */}
      {/* "page-header" is a CSS class in index.css for the dark top banner */}
      <div className="page-header">
        <div className="container">
          <h1>Browse Job Openings</h1>
          <p>Find the perfect role across all our branch locations</p>
        </div>
      </div>

      <div className="container">

        {/* ── Filter Bar ───────────────────────────────────── */}
        {/* "card" CSS class gives white background + padding + shadow */}
        <div className="card" style={{ marginBottom: '32px' }}>
          {/* Grid layout — auto-fit so filters wrap on smaller screens */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            alignItems: 'end',
          }}>

            {/* Search Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Search</label>
              {/* position: 'relative' on the wrapper lets us position the icon inside */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Job title, keywords..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  style={{ paddingLeft: '36px' }} // Extra left padding for the icon
                />
                {/* Search icon positioned inside the input on the left */}
                <svg
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  width="16" height="16" fill="none" viewBox="0 0 24 24"
                  stroke="var(--text-muted)" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Branch Dropdown */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Branch</label>
              <select
                className="form-select"
                value={filters.branch}
                onChange={(e) => handleFilterChange('branch', e.target.value)}
              >
                <option value="">All Branches</option>
                {/* branches was fetched from the API — map each to an <option> */}
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Department Dropdown */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <option value="">All Departments</option>
                {/* DEPARTMENTS is a hardcoded array at the top of this file */}
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Clear Filters Button — only shown when at least one filter is active */}
            {hasActiveFilters && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="btn btn-outline w-full"
                  onClick={handleClearFilters}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  ✕ Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Results Count ─────────────────────────────────── */}
        {/* Only show this row when we have results (not loading, no error) */}
        {!loading && !error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              {/* Pluralize "job" vs "jobs" depending on count */}
              Showing <strong style={{ color: 'var(--text-primary)' }}>{jobs.length}</strong> job{jobs.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtered)'}
            </p>
            {hasActiveFilters && (
              <button onClick={handleClearFilters} style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
              }}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ── Error State ───────────────────────────────────── */}
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {/* ── Main Content: Loading / Empty / Jobs Grid ─────── */}
        {loading ? (
          // Spinner while fetching
          <SectionLoader message="Loading jobs..." />
        ) : jobs.length === 0 ? (
          // Empty state — message differs depending on whether filters are active
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div className="empty-state-icon">🔍</div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '12px 0 8px', color: 'var(--text-primary)' }}>
              No Jobs Found
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {hasActiveFilters
                ? 'No jobs match your current filters. Try adjusting your search.'
                : 'There are no job listings at the moment. Check back soon!'}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-outline" onClick={handleClearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          // Jobs grid — auto-fill creates columns, min 320px each
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
          }}>
            {/* key={job._id} helps React track which items changed when re-rendering */}
            {jobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;
