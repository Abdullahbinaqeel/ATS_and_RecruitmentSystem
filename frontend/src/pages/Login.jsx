// ============================================================
// pages/Login.jsx — User Login Page
//
// Layout: split-screen
//   LEFT  — dark brand panel (hidden on mobile)
//   RIGHT — white login form
//
// FORM BEHAVIOR:
//   1. User types email + password
//   2. On submit, calls login() from AuthContext
//   3. On success → redirects to /hr/dashboard (HR) or /dashboard (candidate)
//   4. On failure → shows error message
//
// The password field has a show/hide toggle (the eye icon button).
// ============================================================

import React, { useState } from 'react';
// useNavigate: lets us redirect after login
// Link: React Router's <a> tag (no page reload)
import { Link, useNavigate } from 'react-router-dom';
// useAuth gives us the login() function from AuthContext
import { useAuth } from '../context/AuthContext';
import { LuBriefcase, LuEye, LuEyeOff, LuCircleAlert } from 'react-icons/lu';


// ============================================================
// Login Component
// ============================================================
const Login = () => {
  // navigate() lets us redirect the user programmatically after login
  const navigate = useNavigate();

  // login() is the function from AuthContext that sends credentials to the server
  const { login } = useAuth();

  // ── Form State ────────────────────────────────────────────────
  // useState('') initializes each field as an empty string
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);  // Controls password visibility
  const [loading, setLoading]   = useState(false);  // True while the login request is in progress
  const [error, setError]       = useState('');     // Error message displayed to the user

  // ── Form Submit Handler ───────────────────────────────────────
  const handleSubmit = async (e) => {
    // e.preventDefault() stops the browser from reloading the page on form submit.
    // By default, HTML forms do a full page refresh — we don't want that in React.
    e.preventDefault();

    setError(''); // Clear any previous error

    // Basic validation before sending to server
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return; // Stop here — don't proceed to the API call
    }

    setLoading(true);

    // Call login() from AuthContext — this handles the API request
    const result = await login(email, password);

    setLoading(false);

    if (result.success) {
      // Redirect based on user role:
      // HR goes to /hr/dashboard, everyone else (candidates) go to /dashboard
      navigate(result.user.role === 'hr' ? '/hr/dashboard' : '/dashboard');
    } else {
      setError(result.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    // Full viewport height, split into two equal halves side-by-side
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Left Panel — Dark Brand Section ─────────────────── */}
      {/* className="auth-left" — CSS hides this on screens < 768px */}
      <div style={{
        flex: '1', background: 'var(--dark)', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px', position: 'relative', overflow: 'hidden',
        minWidth: 0, // Prevents flexbox overflow issues
      }} className="auth-left">

        {/* Background decoration orbs — purely visual */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-20%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          pointerEvents: 'none', // Won't block clicks on content behind it
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo in top-left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #D97706, #EA580C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LuBriefcase color="white" size={20} strokeWidth={2.2} />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
            TalentBridge
          </span>
        </div>

        {/* Main brand message — center of the panel */}
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '800',
            color: '#fff', lineHeight: '1.1', letterSpacing: '-0.03em', marginBottom: '20px',
          }}>
            Your next role is waiting for you.
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-on-dark-2)', lineHeight: '1.75' }}>
            Thousands of candidates have found their dream jobs through TalentBridge. Sign in and take the next step.
          </p>
        </div>

        {/* Stats box at the bottom of the left panel */}
        <div style={{
          padding: '20px 24px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
        }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
            4 cities
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-on-dark-2)' }}>
            Islamabad · Lahore · Karachi · Remote — all hiring now
          </div>
        </div>
      </div>

      {/* ── Right Panel — Login Form ─────────────────────────── */}
      <div style={{
        flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px', background: '#fff', minWidth: 0,
      }}>
        {/* Form is constrained to 400px max width for readability */}
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Heading + sign-up link */}
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em',
              color: 'var(--text-primary)', marginBottom: '8px',
            }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              {/* Link navigates to /register without a page reload */}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                Sign up free
              </Link>
            </p>
          </div>

          {/* Error message — only rendered when error is non-empty */}
          {error && (
            <div className="alert alert-error">
              {/* Warning icon SVG */}
              <LuCircleAlert size={16} strokeWidth={2} />
              {error}
            </div>
          )}

          {/* Login Form */}
          {/* onSubmit is called when the form is submitted (Enter key or submit button) */}
          <form onSubmit={handleSubmit}>

            {/* Email field */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email" type="email" className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)} // Update state on every keystroke
                autoComplete="email" // Browser auto-fill hint
                required // HTML5 validation
              />
            </div>

            {/* Password field with show/hide toggle */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <label className="form-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
                {/* "Forgot password?" — no functionality yet, just UI placeholder */}
                <span style={{ fontSize: '13px', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                  Forgot password?
                </span>
              </div>

              {/* input-with-icon wraps the input + the toggle button together */}
              <div className="input-with-icon">
                {/* type changes between 'password' (hidden) and 'text' (visible) */}
                <input
                  id="password" type={showPw ? 'text' : 'password'} className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" required
                />
                {/* Eye icon button toggles showPw */}
                {/* type="button" prevents it from submitting the form */}
                <button type="button" className="input-icon-btn" onClick={() => setShowPw(s => !s)}>
                  {showPw ? <LuEye size={18} strokeWidth={1.8} /> : <LuEyeOff size={18} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {/* Submit button — disabled while request is in progress */}
            <button type="submit" className="btn btn-primary w-full btn-lg"
              disabled={loading}
              style={{ marginTop: '8px', justifyContent: 'center' }}>
              {loading
                // While loading: spinner + "Signing in…"
                ? <><span className="spinner spinner-sm spinner-white" /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      {/* Hide the left panel on mobile screens — the form takes the full width */}
      <style>{`
        @media (max-width: 768px) { .auth-left { display: none !important; } }
      `}</style>
    </div>
  );
};

export default Login;
