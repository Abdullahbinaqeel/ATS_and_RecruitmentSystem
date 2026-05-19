// ============================================================
// components/JobCard.jsx — Individual Job Listing Card
//
// Displays a single job in a card format.
// Used on the Home page (featured jobs) and the Jobs browse page.
//
// PROPS:
//   job — an object with these fields:
//     _id        — MongoDB document ID (used in the "View role" link)
//     title      — job title (e.g., "Senior Software Engineer")
//     department — department name (e.g., "Engineering")
//     branch     — branch object { name, city } or string
//     seats      — number of open positions
//     status     — "open" or "closed"
//     createdAt  — ISO date string (when the job was posted)
//     description — job description text
//
// FEATURES:
//   - Color-coded department chip (Engineering = blue, Design = orange, etc.)
//   - "Open" / "Closed" status badge
//   - Hover animation (lifts up with a shadow)
//   - "View role" link navigates to /jobs/:id
// ============================================================

import React from 'react';
// Link navigates to a new route without reloading the page
import { Link } from 'react-router-dom';
import { LuMapPin, LuUsers, LuArrowRight } from 'react-icons/lu';

// ── Helper: Format a date string ─────────────────────────────
// toLocaleDateString formats it as "Jan 5, 2025" (readable)
const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── Helper: How long ago was the job posted? ──────────────────
// Returns strings like "Today", "Yesterday", "3d ago", "2mo ago"
const timeAgo = (d) => {
  if (!d) return '';
  // Date.now() is the current timestamp in milliseconds
  // new Date(d).getTime() converts the ISO date string to milliseconds
  const diff = Date.now() - new Date(d).getTime();
  // 86400000 = number of milliseconds in one day (60*60*24*1000)
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return formatDate(d); // Older than a year — show the actual date
};

// ── Helper: Inline SVG Icon ───────────────────────────────────
// (Removed Ico component in favor of lucide-react)

// ── Department Color Palette ──────────────────────────────────
// Maps each department to a background color and text color.
// These are "chip" colors for the department badge at the top of each card.
// "default" is used when the department isn't in the list.
const DEPT_COLORS = {
  Engineering:  { bg: '#EFF6FF', color: '#2563EB' },
  Design:       { bg: '#FFF7ED', color: '#C2410C' },
  Marketing:    { bg: '#F0FDF4', color: '#15803D' },
  Sales:        { bg: '#FDF4FF', color: '#7E22CE' },
  HR:           { bg: '#F5F3FF', color: '#6D28D9' },
  Finance:      { bg: '#FFFBEB', color: '#B45309' },
  Operations:   { bg: '#F0F9FF', color: '#0369A1' },
  default:      { bg: '#F1F5F9', color: '#475569' },
};

// ============================================================
// JobCard Component
// ============================================================
const JobCard = ({ job }) => {
  // Destructure the job object for cleaner access to its fields
  const { _id, title, department, branch, seats, status, createdAt, description } = job;

  // isOpen: true when the job is still accepting applications
  const isOpen = status === 'open';

  // Look up the color scheme for this department.
  // If the department isn't in our list, use the "default" gray colors.
  const deptStyle = DEPT_COLORS[department] || DEPT_COLORS.default;

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border)',
        padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '16px',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)', // Smooth transition for hover effect
        cursor: 'default', position: 'relative', overflow: 'hidden',
      }}
      // Lift the card up and add a shadow on hover
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(10,16,32,0.12)';
        e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; // Blue border tint on hover
      }}
      // Reset styles when the mouse leaves
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* ── Top Row: Department Chip + Status Badge ─────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {/* Department chip — pill shape with department-specific colors */}
        <span style={{
          fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '9999px',
          background: deptStyle.bg, color: deptStyle.color, letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          {department}
        </span>

        {/* Status badge — CSS class "badge-open" or "badge-closed" from index.css */}
        <span className={`badge badge-${isOpen ? 'open' : 'closed'}`}>
          {isOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      {/* ── Job Title + Description Preview ─────────────── */}
      <div>
        <h3 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '17px', fontWeight: '700',
          color: 'var(--text-primary)', lineHeight: '1.35', marginBottom: '6px',
        }}>
          {title}
        </h3>

        {/* Description is optional — only render if it exists */}
        {description && (
          <p style={{
            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.65',
            // CSS to clamp text to 2 lines with an ellipsis (...) if it overflows
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {description}
          </p>
        )}
      </div>

      {/* ── Meta Info: Location + Seats ─────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {/* Location row — uses a map pin SVG icon */}
        <MetaRow Icon={LuMapPin}>
          {/* branch?.name uses optional chaining — safe even if branch is null */}
          {branch?.name || branch || 'Multiple locations'}
          {branch?.city ? `, ${branch.city}` : ''}
        </MetaRow>

        {/* Seats row — uses a people/group SVG icon */}
        <MetaRow Icon={LuUsers}>
          {/* Pluralize "position" vs "positions" based on seats count */}
          {seats} {seats === 1 ? 'position' : 'positions'} open
        </MetaRow>
      </div>

      {/* ── Card Footer: Time + "View role" Link ─────────── */}
      {/* marginTop: 'auto' pushes this to the bottom of the flex column */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '14px', borderTop: '1px solid var(--border)', marginTop: 'auto',
      }}>
        {/* How long ago the job was posted (e.g., "3d ago") */}
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
          {timeAgo(createdAt)}
        </span>

        {/* "View role" link — navigates to the job detail page */}
        {/* Template literal `/jobs/${_id}` builds the URL with the job's ID */}
        <Link to={`/jobs/${_id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', fontWeight: '700', color: 'var(--primary)',
          fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em',
          transition: 'gap 0.2s',
        }}
          // Arrow slides right on hover — gap increases from 6px to 10px
          onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
          onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
        >
          View role
          {/* Right arrow icon */}
          <LuArrowRight size={14} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
};

// ============================================================
// MetaRow — Small helper component for icon + text rows
// Used for location and seats info inside the card
// ============================================================
const MetaRow = ({ Icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)' }}>
    <Icon size={14} strokeWidth={1.8} />
    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
      {children}
    </span>
  </div>
);

export default JobCard;
