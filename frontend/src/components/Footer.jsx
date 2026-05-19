// ============================================================
// components/Footer.jsx — Dark Bottom Footer
//
// A simple presentational component (no state, no logic).
// Shows:
//   - Brand logo + description
//   - Platform navigation links
//   - Branch city names
//   - Copyright year + "all systems operational" status
//
// It uses React Router's <Link> for internal navigation links
// so clicking "Home" or "Browse Jobs" doesn't reload the page.
//
// WHERE RENDERED: App.jsx — appears on EVERY page, below all content
// ============================================================

import React from 'react';
// Link is React Router's version of <a href="...">.
// It navigates without a full page reload.
import { Link } from 'react-router-dom';
import { LuBriefcase } from 'react-icons/lu';

const Footer = () => {
  // Get the current year dynamically.
  // This means the copyright year is always correct without manual updates.
  const year = new Date().getFullYear();

  return (
    // The footer uses CSS custom properties (var(--dark), var(--text-on-dark))
    // These are defined in index.css as design tokens (reusable values)
    <footer style={{ background: 'var(--dark)', color: 'var(--text-on-dark)' }}>
      <div className="container" style={{ padding: '64px 28px 0' }}>

        {/* ── Top Grid: Brand + Navigation + Branches ──────── */}
        {/* CSS grid: 2fr 1fr 1fr means brand column is twice as wide */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: '48px',
          paddingBottom: '48px',
          borderBottom: '1px solid var(--dark-border)',
        }}
          className="footer-grid"> {/* This class is used for the mobile responsive override below */}

          {/* ── Brand Column ─────────────────────────────── */}
          <div>
            {/* Logo mark + wordmark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              {/* Gradient square icon */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '9px',
                background: 'linear-gradient(135deg, #D97706, #EA580C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LuBriefcase color="white" size={18} strokeWidth={2.2} />
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '17px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                TalentBridge
              </span>
            </div>
            {/* Short description */}
            <p style={{ fontSize: '14px', color: 'var(--text-on-dark-2)', lineHeight: '1.8', maxWidth: '280px' }}>
              The modern recruitment platform for multi-branch software houses in Pakistan.
              Find talent. Find opportunity.
            </p>
          </div>

          {/* ── Platform Navigation Column ────────────────── */}
          <div>
            {/* Section heading — small, uppercase, spaced letters */}
            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-on-dark-2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
              Platform
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Map over an array of [path, label] tuples to render multiple links */}
              {[['/', 'Home'], ['/jobs', 'Browse Jobs'], ['/login', 'Log in'], ['/register', 'Sign up']].map(([to, label]) => (
                <Link key={to} to={to} style={{
                  fontSize: '14px', color: 'var(--text-on-dark-2)',
                  transition: 'color 0.2s', display: 'inline-block',
                }}
                  // Hover effect: change color to white on hover
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-on-dark-2)'; }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Branches Column ───────────────────────────── */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-on-dark-2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
              Branches
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Static list of branch cities — hardcoded since it's just decorative */}
              {['Islamabad', 'Lahore', 'Karachi', 'Remote'].map(city => (
                <span key={city} style={{ fontSize: '14px', color: 'var(--text-on-dark-2)' }}>{city}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Bar: Copyright + Status ───────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 0', flexWrap: 'wrap', gap: '12px',
        }}>
          {/* Copyright notice — year is dynamic */}
          <p style={{ fontSize: '13px', color: 'var(--text-on-dark-2)' }}>
            © {year} TalentBridge. All rights reserved.
          </p>

          {/* Status indicator — green dot + "operational" text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Small green dot */}
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-on-dark-2)' }}>
              All systems operational
            </p>
          </div>
        </div>
      </div>

      {/* ── Responsive CSS Override ───────────────────────── */}
      {/* On screens narrower than 640px, collapse the 3-column grid to 1 column */}
      {/* <style> tags inside JSX inject CSS into the document */}
      <style>{`
        @media (max-width: 640px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
