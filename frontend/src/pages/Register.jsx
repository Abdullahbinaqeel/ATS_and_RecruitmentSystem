// ============================================================
// pages/Register.jsx — User Registration Page
//
// Layout: split-screen
//   LEFT  — dark brand panel with feature list (hidden on mobile)
//   RIGHT — white registration form
//
// FORM FIELDS:
//   - Role toggle (Job Seeker / HR Recruiter) — shown first
//   - Full name
//   - Email
//   - Password (with strength meter + show/hide toggle)
//   - Confirm password (with show/hide toggle)
//
// VALIDATION:
//   - All done on the frontend before sending to server
//   - Individual field errors shown below each input
//   - General error shown at the top if the server rejects the request
//
// ON SUCCESS:
//   - Redirects to /login with a success message
//   - We don't auto-login because the user should explicitly sign in
// ============================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── EyeIcon: Password Visibility Toggle ──────────────────────
// Same component as in Login.jsx — open=true shows eye, false shows eye-with-slash
const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {open
      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
    }
  </svg>
);

// ── Password Strength Meter ───────────────────────────────────
// Returns an object with: label, color, w (bar width %)
// Returns null if password is empty (so the bar isn't shown at all)
const getStrength = (pw) => {
  if (!pw) return null;
  if (pw.length < 6) return { label: 'Too short', color: 'var(--danger)', w: '20%' };
  if (pw.length < 8) return { label: 'Weak', color: 'var(--warning)', w: '40%' };
  // /[A-Z]/.test(pw) checks for at least one uppercase letter
  // /[0-9]/.test(pw) checks for at least one digit
  if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return { label: 'Fair', color: 'var(--warning)', w: '60%' };
  if (pw.length >= 10) return { label: 'Strong', color: 'var(--success)', w: '100%' };
  return { label: 'Good', color: 'var(--success)', w: '80%' };
};

// ============================================================
// Register Component
// ============================================================
const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth(); // register() from AuthContext

  // ── Form State ────────────────────────────────────────────────
  // All fields are stored in one object (instead of separate useState calls)
  // This makes it easier to pass to the register() function
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'candidate', // Default role when the form opens
  });

  const [showPw, setShowPw]     = useState(false); // Password visibility
  const [showCp, setShowCp]     = useState(false); // Confirm password visibility
  const [loading, setLoading]   = useState(false); // True while API request is in progress
  const [error, setError]       = useState('');    // Global error message (from server)
  const [fieldErrors, setFieldErrors] = useState({}); // Per-field validation errors

  // ── Handle Input Changes ──────────────────────────────────────
  // e.target.name reads the "name" attribute of the input element
  // This lets us use ONE handler for ALL text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Spread operator (...p) copies all existing form fields,
    // then we override just the changed field
    setForm(p => ({ ...p, [name]: value }));
    // Clear the field's error message as the user starts typing a correction
    if (fieldErrors[name]) setFieldErrors(p => ({ ...p, [name]: '' }));
  };

  // ── Frontend Validation ───────────────────────────────────────
  // Returns an object of error messages keyed by field name.
  // If no errors, returns an empty object {}.
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    // Regex to check basic email format: something@something.something
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    return e;
  };

  // ── Form Submit Handler ───────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submit (page reload)
    setError('');

    // Run validation — if any errors, show them and stop
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);

    // Call register() from AuthContext — sends data to the backend
    const result = await register(form.name, form.email, form.password, form.role);

    setLoading(false);

    if (result.success) {
      // Navigate to login page with a success state message
      // { state: { message: '...' } } passes data to the destination page
      navigate('/login', { state: { message: 'Account created! Please log in.' } });
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }
  };

  // Calculate password strength for the live meter
  const strength = getStrength(form.password);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Left Panel — Dark Brand Section ─────────────────── */}
      {/* Hidden on mobile via CSS .auth-left media query */}
      <div style={{
        flex: '1', background: 'var(--dark)', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px', position: 'relative', overflow: 'hidden',
        minWidth: 0,
      }} className="auth-left">

        {/* Background decoration orbs */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-20%', width: '500px', height: '500px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
            TalentBridge
          </span>
        </div>

        {/* Brand headline */}
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '800',
            color: '#fff', lineHeight: '1.1', letterSpacing: '-0.03em', marginBottom: '20px',
          }}>
            Join thousands building their careers.
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-on-dark-2)', lineHeight: '1.75' }}>
            Create your free account in under a minute. Upload your resume once, apply to as many roles as you want.
          </p>
        </div>

        {/* Feature checklist at the bottom of the left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
          {[
            'Apply to multiple roles with one profile',
            'Real-time status tracking at every step',
            'Interview invitations sent directly to your email',
          ].map((text) => (
            <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              {/* Blue circle with checkmark */}
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px',
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-on-dark-2)', lineHeight: '1.6' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel — Registration Form ─────────────────── */}
      <div style={{
        flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px', background: '#fff', overflowY: 'auto', minWidth: 0,
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Form heading */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em',
              color: 'var(--text-primary)', marginBottom: '8px',
            }}>
              Create your account
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              Already have one?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Sign in</Link>
            </p>
          </div>

          {/* Global error message from server */}
          {error && (
            <div className="alert alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ── Role Selector ─────────────────────────────── */}
            {/* Shown first since it changes the meaning of the account */}
            <div className="form-group">
              <label className="form-label">I am joining as</label>
              {/* Two-column grid for the role toggle buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { val: 'candidate', label: 'Job Seeker',   desc: 'Browse & apply' },
                  { val: 'hr',        label: 'HR Recruiter', desc: 'Post & manage jobs' },
                ].map(opt => (
                  // Each role option is a button that sets form.role
                  // type="button" prevents accidental form submission
                  <button key={opt.val} type="button" onClick={() => setForm(p => ({ ...p, role: opt.val }))}
                    style={{
                      padding: '12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      // Selected = blue border + light blue background; unselected = gray border
                      border: `2px solid ${form.role === opt.val ? 'var(--primary)' : 'var(--border)'}`,
                      background: form.role === opt.val ? 'var(--primary-light)' : 'transparent',
                      transition: 'all 0.2s',
                    }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: form.role === opt.val ? 'var(--primary)' : 'var(--text-primary)', marginBottom: '2px' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full name</label>
              {/* name="name" matches the key in form state so handleChange works */}
              <input id="name" name="name" type="text" className="form-input"
                placeholder="Ahmad Ali" value={form.name} onChange={handleChange} autoComplete="name" />
              {/* Show field-specific error below the input if it exists */}
              {fieldErrors.name && <span className="form-error">{fieldErrors.name}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" className="form-input"
                placeholder="you@example.com" value={form.email} onChange={handleChange} autoComplete="email" />
              {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
            </div>

            {/* Password + Strength Meter */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-with-icon">
                <input id="password" name="password" type={showPw ? 'text' : 'password'}
                  className="form-input" placeholder="Min. 6 characters"
                  value={form.password} onChange={handleChange} autoComplete="new-password" />
                <button type="button" className="input-icon-btn" onClick={() => setShowPw(s => !s)}>
                  <EyeIcon open={showPw} />
                </button>
              </div>

              {/* Password strength meter — only shown when user has typed something */}
              {strength && (
                <div style={{ marginTop: '8px' }}>
                  {/* Progress bar: width and color change based on password strength */}
                  <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: strength.w, background: strength.color, borderRadius: '2px', transition: 'width 0.3s ease' }} />
                  </div>
                  {/* Strength label below the bar */}
                  <span style={{ fontSize: '11px', color: strength.color, fontWeight: '600', marginTop: '4px', display: 'block' }}>{strength.label}</span>
                </div>
              )}
              {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
              <div className="input-with-icon">
                <input id="confirmPassword" name="confirmPassword" type={showCp ? 'text' : 'password'}
                  className="form-input" placeholder="Repeat your password"
                  value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
                <button type="button" className="input-icon-btn" onClick={() => setShowCp(s => !s)}>
                  <EyeIcon open={showCp} />
                </button>
              </div>
              {fieldErrors.confirmPassword && <span className="form-error">{fieldErrors.confirmPassword}</span>}
            </div>

            {/* Submit Button — label changes based on selected role */}
            <button type="submit" className="btn btn-primary w-full btn-lg"
              disabled={loading} style={{ marginTop: '8px', justifyContent: 'center' }}>
              {loading
                ? <><span className="spinner spinner-sm spinner-white" /> Creating account…</>
                : `Create ${form.role === 'hr' ? 'recruiter' : 'candidate'} account`}
            </button>
          </form>

          {/* Legal disclaimer */}
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* Hide left panel on mobile */}
      <style>{`
        @media (max-width: 768px) { .auth-left { display: none !important; } }
      `}</style>
    </div>
  );
};

export default Register;
