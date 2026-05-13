// ============================================================
// pages/Home.jsx — Landing Page
//
// This is the first page most users see. It has four sections:
//   1. Hero      — dark background, big headline, CTA buttons, animated stats
//   2. Featured Jobs — up to 6 open jobs fetched from the API
//   3. How It Works — 3-step process explained with icons
//   4. Bottom CTA  — encourages sign-up
//
// DATA FETCHED:
//   GET /api/jobs?status=open — to show featured open jobs
//   GET /api/branches         — to update the "branches" stat
//
// Both requests are made in PARALLEL using Promise.all() for speed.
// ============================================================

import React, { useState, useEffect } from 'react';
// Link: React Router's <a> tag — navigates without a full page reload
import { Link } from 'react-router-dom';
// Our configured axios instance (handles base URL + auth token automatically)
import api from '../api/axios';
// Reusable components from our project
import JobCard from '../components/JobCard';
import { SectionLoader } from '../components/Loader';

// ============================================================
// Counter — Animated Number Counter
//
// Counts up from 0 to a target number over ~1.4 seconds.
// Used in the stats row of the hero section.
//
// Props:
//   target  — the final number to count to
//   suffix  — text appended after the number (default "+")
// ============================================================
const Counter = ({ target, suffix = '+' }) => {
  // count: the currently displayed number
  const [count, setCount] = useState(0);

  // useEffect runs the animation when the target value is available
  useEffect(() => {
    if (!target) return;
    const steps = 60;            // Total animation steps
    const inc = target / steps;  // How much to increment each step
    let cur = 0;

    // setInterval calls our function repeatedly every (1400/60) ≈ 23ms
    const id = setInterval(() => {
      cur += inc;
      if (cur >= target) {
        setCount(target); // Snap to exact value at the end
        clearInterval(id); // Stop the interval when done
      } else {
        setCount(Math.floor(cur)); // Show integer at each step
      }
    }, 1400 / steps);

    // Cleanup: cancel the interval if this component is removed before it finishes
    return () => clearInterval(id);
  }, [target]); // Re-run if target changes

  // toLocaleString adds thousands separators: 1000 → "1,000"
  return <>{count.toLocaleString()}{suffix}</>;
};

// ============================================================
// Icon — Reusable Inline SVG Icon
//
// Props:
//   d      — SVG path data string
//   size   — pixel size (default 20)
//   color  — stroke/fill color (default "currentColor" = inherits from CSS)
//   stroke — if true, uses stroke; if false, fills the path
// ============================================================
const Icon = ({ d, size = 20, color = 'currentColor', stroke = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke ? 'none' : color}
    stroke={stroke ? color : 'none'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ============================================================
// Home — Main Component
// ============================================================
const Home = () => {
  // featuredJobs: array of job objects to display in the grid
  const [featuredJobs, setFeaturedJobs] = useState([]);

  // jobsLoading: true while API request is in progress
  const [jobsLoading, setJobsLoading] = useState(true);

  // stats: the numbers shown in the hero (with fallback defaults)
  const [stats, setStats] = useState({ totalJobs: 120, totalApplications: 840, totalBranches: 4 });

  // useEffect with [] = fetch data ONCE when the component first renders
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      // Promise.all sends BOTH requests at the same time (parallel).
      // This is faster than sending them one after the other (sequential).
      const [jobsRes, branchRes] = await Promise.all([
        api.get('/api/jobs?status=open'),
        api.get('/api/branches'),
      ]);

      if (jobsRes.data.success) {
        // Show only the first 6 jobs on the home page (slice(0, 6))
        setFeaturedJobs(jobsRes.data.data.slice(0, 6));

        // Update stats with real data from the API.
        // prev => ({ ...prev, ... }) spreads existing stats and overrides specific fields
        setStats(prev => ({
          ...prev,
          totalJobs: jobsRes.data.data.length || prev.totalJobs,
          totalBranches: branchRes.data.success ? branchRes.data.data.length : prev.totalBranches,
        }));
      }
    } catch (e) {
      // Silently fail — the home page still renders with default stats
      console.error(e);
    } finally {
      // Always set loading to false, even if the request failed
      setJobsLoading(false);
    }
  };

  return (
    <div>

      {/* ══════════════════════════════════════════════════════
          HERO SECTION
          Full-viewport dark background with headline + CTA
          ══════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        background: 'var(--dark)',
        minHeight: '92vh',         // At least 92% of viewport height
        display: 'flex',
        alignItems: 'center',      // Vertically center content
        overflow: 'hidden',        // Hide the gradient orbs that go off-screen
      }}>

        {/* Decorative gradient orb — top right */}
        {/* pointerEvents: 'none' means it doesn't block clicks on content below */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
          animation: 'orbFloat 14s ease-in-out infinite', // CSS keyframe animation from index.css
          pointerEvents: 'none',
        }} />

        {/* Decorative gradient orb — bottom left */}
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-8%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)',
          animation: 'orbFloat 18s ease-in-out infinite reverse', // Slower + reversed
          pointerEvents: 'none',
        }} />

        {/* Subtle grid pattern overlaid on the background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px', // Grid cell size
        }} />

        {/* Gradient fade at the bottom of the hero into the page background */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px',
          background: 'linear-gradient(to bottom, transparent, var(--bg))',
          pointerEvents: 'none',
        }} />

        {/* Hero content */}
        <div className="container" style={{ position: 'relative', padding: '100px 28px 80px' }}>

          {/* "Hiring across Pakistan" badge */}
          <div style={{ marginBottom: '28px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
              color: '#93C5FD', padding: '6px 16px', borderRadius: '9999px',
              fontSize: '12px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {/* Small blue dot */}
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />
              Hiring across Pakistan
            </span>
          </div>

          {/* Main headline */}
          {/* clamp(40px, 7vw, 80px): font-size is min 40px, max 80px, preferred 7% of viewport width */}
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(40px, 7vw, 80px)',
            fontWeight: '800',
            color: '#fff',
            lineHeight: '1.05',
            letterSpacing: '-0.03em',
            maxWidth: '820px',
            marginBottom: '28px',
          }}>
            Your next great{' '}
            {/* Gradient text effect: uses background clipping so the gradient shows through text */}
            <span style={{
              background: 'linear-gradient(135deg, #60A5FA, #818CF8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              career
            </span>
            <br />starts here.
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: 'clamp(16px, 2.5vw, 19px)',
            color: 'var(--text-on-dark-2)',
            maxWidth: '520px',
            lineHeight: '1.75',
            marginBottom: '44px',
          }}>
            Browse open roles across Islamabad, Lahore, Karachi and remote.
            Apply in minutes. Track every step of your journey.
          </p>

          {/* CTA Buttons */}
          {/* flexWrap: 'wrap' means the buttons stack vertically on narrow screens */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '80px' }}>
            <Link to="/jobs" className="btn btn-white btn-xl">
              Browse Open Roles
              <Icon d="M17 8l4 4m0 0l-4 4m4-4H3" size={18} />
            </Link>
            <Link to="/register" className="btn btn-dark btn-xl">
              Post a Job
            </Link>
          </div>

          {/* ── Stats Row ─────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: '0', flexWrap: 'wrap',
            borderTop: '1px solid var(--dark-border)', paddingTop: '40px',
          }}>
            {[
              { label: 'Open Positions',       value: stats.totalJobs },
              { label: 'Applications Sent',    value: stats.totalApplications },
              { label: 'Office Branches',      value: stats.totalBranches, suffix: '' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '0 40px 0 0',
                marginRight: '40px',
                // Vertical divider between stats (not after the last one)
                borderRight: i < 2 ? '1px solid var(--dark-border)' : 'none',
              }}>
                {/* Counter animates from 0 to the value */}
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '800',
                  color: '#fff', lineHeight: '1', marginBottom: '6px',
                }}>
                  <Counter target={s.value} suffix={s.suffix ?? '+'} />
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-on-dark-2)', fontWeight: '500' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURED JOBS SECTION
          Shows up to 6 open jobs in a responsive grid
          ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '96px 0' }}>
        <div className="container">
          {/* Section header: title on left, "View all" on right */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '48px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div className="section-label">Latest Openings</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Featured job listings
              </h2>
            </div>
            <Link to="/jobs" className="btn btn-ghost btn-sm">
              View all roles
              <Icon d="M17 8l4 4m0 0l-4 4m4-4H3" size={16} />
            </Link>
          </div>

          {/* Conditional rendering:
              - While loading: show spinner
              - If no jobs: show empty state
              - Otherwise: show job cards grid */}
          {jobsLoading ? (
            <SectionLoader message="Loading jobs..." />
          ) : featuredJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Icon d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size={28} color="var(--text-muted)" />
              </div>
              <h3>No openings yet</h3>
              <p>New positions are added regularly. Check back soon.</p>
            </div>
          ) : (
            // auto-fill grid: creates as many columns as will fit,
            // each at least 340px wide
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}>
              {/* Map over jobs array to render a JobCard for each */}
              {featuredJobs.map(job => <JobCard key={job._id} job={job} />)}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS SECTION
          3-step process in dark cards
          ══════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--dark-2)', padding: '96px 0' }}>
        <div className="container">
          {/* Section heading — centered */}
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <span className="section-label" style={{ color: '#93C5FD' }}>
                Simple Process
              </span>
            </div>
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: '800',
              color: '#fff', letterSpacing: '-0.02em',
            }}>
              Three steps to your new role
            </h2>
          </div>

          {/* Steps grid — auto-fit creates as many columns as fit at 280px minimum */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {/* Step data is an array of objects so it's easy to add/remove steps */}
            {[
              {
                n: '01',
                title: 'Create your profile',
                desc: 'Sign up in seconds. Upload your resume and cover letter to your profile — apply to any role instantly.',
                icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
              },
              {
                n: '02',
                title: 'Apply with one click',
                desc: 'Browse roles by city or department. Your resume is already attached — just hit apply and you\'re done.',
                icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
              },
              {
                n: '03',
                title: 'Track every update',
                desc: 'Watch your application move from submitted to shortlisted to hired — get email alerts at every stage.',
                icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
              },
            ].map((step) => (
              // "card-glass" is a CSS class in index.css for a frosted-glass dark card
              <div key={step.n} className="card-glass" style={{ position: 'relative' }}>
                {/* Step number in the top-right corner */}
                <span style={{
                  position: 'absolute', top: '24px', right: '24px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.15)',
                  letterSpacing: '0.04em',
                }}>
                  {step.n}
                </span>

                {/* Step icon in a rounded square */}
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '20px',
                }}>
                  <Icon d={step.icon} size={22} color="#60A5FA" />
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '10px' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-on-dark-2)', lineHeight: '1.75' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BOTTOM CTA SECTION
          Final push to sign up or browse jobs
          ══════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--dark)', padding: '100px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '40px' }}>

          {/* Left: Headline + subtext */}
          <div style={{ maxWidth: '560px' }}>
            {/* Blue accent line above headline — a design detail */}
            <div style={{
              width: '40px', height: '3px', borderRadius: '2px',
              background: 'var(--primary)', marginBottom: '24px',
            }} />
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: '800',
              color: '#fff', lineHeight: '1.1', letterSpacing: '-0.02em', marginBottom: '16px',
            }}>
              Ready to find your next role?
            </h2>
            <p style={{ fontSize: '17px', color: 'var(--text-on-dark-2)', lineHeight: '1.75' }}>
              Join thousands of candidates who found their next opportunity through TalentBridge.
              It's free. It's fast. It works.
            </p>
          </div>

          {/* Right: Two stacked CTA buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '200px' }}>
            <Link to="/register" className="btn btn-white btn-xl" style={{ justifyContent: 'center' }}>
              Get started — it's free
            </Link>
            <Link to="/jobs" className="btn btn-dark btn-xl" style={{ justifyContent: 'center' }}>
              Browse open roles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
