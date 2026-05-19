// ============================================================
// components/Navbar.jsx — Sticky Top Navigation Bar
//
// WHAT THIS COMPONENT DOES:
//   - Shows the TalentBridge logo (links to home)
//   - Shows navigation links (different links based on user role)
//   - Starts transparent on the Home page hero, turns white on scroll
//   - Collapses into a hamburger menu on mobile screens
//
// KEY BEHAVIORS:
//   - isDark: true when on the home page AND not yet scrolled.
//             Controls whether text/background is light (dark hero) or dark (white bg).
//   - menuOpen: controls the mobile dropdown visibility
//   - scrolled: tracks if the user has scrolled more than 40px
//
// REACT ROUTER HOOKS USED:
//   - useLocation(): returns the current URL path (e.g., "/jobs")
//   - useNavigate(): gives a function to navigate programmatically
//   - Link: a component that renders an <a> tag but uses React Router
//           (no full page reload — just swaps the component)
//
// WHERE RENDERED: App.jsx — it appears on EVERY page
// ============================================================

import React, { useState, useEffect } from 'react';

// Link: like <a href="..."> but uses React Router (no page reload)
// useLocation: tells us the current URL path
// useNavigate: gives us a navigate() function to redirect programmatically
import { Link, useLocation, useNavigate } from 'react-router-dom';

// useAuth gives us the current user, login status, and logout function
import { useAuth } from '../context/AuthContext';
// useTheme gives us current theme ('light'/'dark') and toggleTheme()
import { useTheme } from '../context/ThemeContext';
import { LuBriefcase, LuSun, LuMoon } from 'react-icons/lu';

const Navbar = () => {
  // menuOpen: is the mobile hamburger menu visible?
  // useState(false) = starts closed
  const [menuOpen, setMenuOpen] = useState(false);

  // scrolled: has the user scrolled more than 40px?
  // Used to switch between transparent and white navbar
  const [scrolled, setScrolled] = useState(false);

  // location.pathname is the current URL path, e.g., "/" or "/jobs"
  const location = useLocation();

  // navigate('/some-path') is used in the logout handler to redirect after logout
  const navigate = useNavigate();

  // Get the current user's data and auth helpers from the global context
  const { user, isAuthenticated, logout } = useAuth();

  // Get the current theme and toggle function from ThemeContext
  const { theme, toggleTheme } = useTheme();

  // ── Scroll Detection ─────────────────────────────────────────
  // useEffect with an empty [] runs once on mount to attach a scroll listener.
  // The cleanup function (return) removes the listener when the component unmounts.
  // Without cleanup, the listener would run even after the Navbar is removed.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Close Mobile Menu on Route Change ────────────────────────
  // [location.pathname] means this effect re-runs every time the URL changes.
  // This closes the hamburger menu when the user navigates to a new page.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // isHome: true only when we're on the root URL "/"
  const isHome = location.pathname === '/';

  // isActive: returns true if a given path matches the current URL
  // We use startsWith for nested routes (e.g., /hr/jobs counts as active for /hr)
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // isDark: the navbar is "dark mode" when on the home page AND not scrolled yet.
  // This lets the navbar be transparent over the dark hero image.
  const isDark = isHome && !scrolled;

  // Log out and redirect home
  const handleLogout = () => { logout(); navigate('/'); };

  // ── Dynamic Styles ────────────────────────────────────────────
  // These styles change based on isDark — they're computed as JavaScript objects
  // and applied inline. React supports this style of CSS-in-JS.
  const navStyle = {
    position: 'sticky', top: 0, zIndex: 200, // Sticks to top of screen when scrolling
    transition: 'background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
    // Transparent dark when over hero, frosted-glass white otherwise
    background: isDark
      ? 'rgba(6, 12, 24, 0.6)'
      : 'rgba(255, 255, 255, 0.94)',
    backdropFilter: 'blur(16px)', // Frosted-glass blur effect
    WebkitBackdropFilter: 'blur(16px)', // Safari-specific prefix for the same effect
    borderBottom: isDark
      ? '1px solid rgba(255,255,255,0.07)'
      : '1px solid var(--border)',
    boxShadow: scrolled && !isDark ? '0 1px 20px rgba(10,16,32,0.08)' : 'none',
  };

  // Text colors adapt to whether we're in dark or light mode
  const textColor = isDark ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)';
  const activeColor = isDark ? '#fff' : 'var(--primary)';
  const logoColor = isDark ? '#fff' : 'var(--text-primary)';

  return (
    <nav style={navStyle}>
      <div className="container">
        {/* Main bar row: logo + desktop nav + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>

          {/* ── Logo ─────────────────────────────────────── */}
          {/* Clicking the logo navigates home without a page reload */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Gradient square with briefcase icon */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #D97706, #EA580C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <LuBriefcase color="white" size={18} strokeWidth={2.2} />
            </div>
            {/* Brand name text — color changes based on isDark */}
            <span style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '17px', fontWeight: '800',
              color: logoColor, letterSpacing: '-0.02em',
              transition: 'color 0.3s',
            }}>
              TalentBridge
            </span>
          </Link>

          {/* ── Desktop Navigation Links ──────────────────── */}
          {/* Hidden on mobile (CSS hides .desktop-nav below 768px) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="desktop-nav">

            {/* "Browse Jobs" is always visible */}
            <NavLink to="/jobs" active={isActive('/jobs')} textColor={textColor} activeColor={activeColor}>
              Browse Jobs
            </NavLink>

            {/* Show Login + Sign Up only when the user is NOT logged in */}
            {!isAuthenticated && (
              <>
                {/* Vertical divider line */}
                <div style={{ width: '1px', height: '16px', background: isDark ? 'rgba(255,255,255,0.15)' : 'var(--border)', margin: '0 8px' }} />

                {/* Log in link — subtle, text-only style */}
                <Link to="/login" style={{
                  padding: '7px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                  color: textColor, transition: 'color 0.3s', letterSpacing: '-0.01em',
                }}>
                  Log in
                </Link>

                {/* Sign up link — prominent button style */}
                <Link to="/register" style={{
                  padding: '8px 18px', borderRadius: '9px', fontSize: '14px', fontWeight: '600',
                  background: 'var(--primary)', color: '#fff',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
                  transition: 'all 0.22s',
                  letterSpacing: '-0.01em',
                }}
                  // onMouseEnter / onMouseLeave add hover effects via inline JS
                  // We do this because CSS :hover is hard to combine with dynamic inline styles
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Sign up free
                </Link>
              </>
            )}

            {/* Candidate-specific links — only shown when logged in as candidate */}
            {isAuthenticated && user?.role === 'candidate' && (
              <>
                <NavLink to="/dashboard" active={isActive('/dashboard')} textColor={textColor} activeColor={activeColor}>Dashboard</NavLink>
                <NavLink to="/profile" active={isActive('/profile')} textColor={textColor} activeColor={activeColor}>Profile</NavLink>
              </>
            )}

            {/* HR-specific links — only shown when logged in as hr */}
            {isAuthenticated && user?.role === 'hr' && (
              <>
                <NavLink to="/hr/dashboard" active={isActive('/hr/dashboard')} textColor={textColor} activeColor={activeColor}>Dashboard</NavLink>
                <NavLink to="/hr/jobs" active={isActive('/hr/jobs')} textColor={textColor} activeColor={activeColor}>Jobs</NavLink>
                <NavLink to="/hr/branches" active={isActive('/hr/branches')} textColor={textColor} activeColor={activeColor}>Branches</NavLink>
              </>
            )}

            {/* Avatar + Logout button — shown when logged in */}
            {isAuthenticated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px' }}>
                {/* Circular avatar with first letter of user's name */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: '700', fontSize: '13px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0,
                }}>
                  {/* charAt(0) gets the first character; toUpperCase() capitalizes it */}
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>

                {/* Log out button — calls handleLogout on click */}
                <button onClick={handleLogout} style={{
                  padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  color: textColor, background: isDark ? 'rgba(255,255,255,0.08)' : 'var(--bg)',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--border)',
                  cursor: 'pointer', transition: 'all 0.22s', letterSpacing: '-0.01em',
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>

          {/* ── Dark / Light Mode Toggle ─────────────────────── */}
          {/* Visible on BOTH desktop and mobile — sits right of nav links */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            style={{
              width: '36px', height: '36px',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'var(--bg)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--border)',
              color: isDark ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.22s',
              flexShrink: 0,
              marginLeft: '6px',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {/* Sun icon — shown in dark mode (click to go light) */}
            {theme === 'dark' ? (
              <LuSun size={16} strokeWidth={2} />
            ) : (
              /* Moon icon — shown in light mode (click to go dark) */
              <LuMoon size={15} strokeWidth={2} />
            )}
          </button>

          {/* ── Hamburger Button (Mobile Only) ─────────────── */}
          {/* display: 'none' by default — CSS shows it on small screens */}
          <button
            onClick={() => setMenuOpen(o => !o)} // Toggle: open → close, close → open
            className="hamburger-btn"
            aria-label="Toggle menu" // Accessibility: screen readers announce this
            style={{ display: 'none', flexDirection: 'column', gap: '5px', padding: '8px', cursor: 'pointer' }}
          >
            {/* Three bars that animate into an X when menu is open */}
            {[
              menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
              menuOpen ? 'none' : 'none',
              menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
            ].map((transform, i) => (
              <span key={i} style={{
                display: 'block', width: '22px', height: '2px', borderRadius: '2px',
                background: isDark ? 'rgba(255,255,255,0.8)' : 'var(--text-primary)',
                transition: 'all 0.22s',
                transform,
                // The middle bar fades out when the menu opens (so 3 lines → X shape)
                opacity: i === 1 && menuOpen ? 0 : 1,
              }} />
            ))}
          </button>
        </div>

        {/* ── Mobile Dropdown Menu ───────────────────────── */}
        {/* Only rendered when menuOpen is true (conditional rendering) */}
        {menuOpen && (
          <div style={{
            borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid var(--border)',
            paddingBottom: '16px',
            animation: 'slideDown 0.2s ease', // CSS animation from index.css
          }}>
            {/* Build the menu item list, then filter out items where show is false */}
            {[
              { to: '/jobs', label: 'Browse Jobs', show: true },
              { to: '/login',    label: 'Log in',      show: !isAuthenticated },
              { to: '/register', label: 'Sign up',     show: !isAuthenticated },
              { to: '/dashboard',    label: 'My Dashboard', show: isAuthenticated && user?.role === 'candidate' },
              { to: '/profile',      label: 'Profile',      show: isAuthenticated && user?.role === 'candidate' },
              { to: '/hr/dashboard', label: 'HR Dashboard',  show: isAuthenticated && user?.role === 'hr' },
              { to: '/hr/jobs',      label: 'Manage Jobs',   show: isAuthenticated && user?.role === 'hr' },
              { to: '/hr/branches',  label: 'Branches',      show: isAuthenticated && user?.role === 'hr' },
            ].filter(i => i.show).map(item => (
              // Each visible link gets bold + blue accent if it's the active route
              <Link key={item.to} to={item.to} style={{
                display: 'block', padding: '12px 16px',
                fontSize: '15px', fontWeight: isActive(item.to) ? '700' : '500',
                color: isActive(item.to)
                  ? (isDark ? '#FEF3C7' : 'var(--primary)')
                  : (isDark ? 'rgba(255,255,255,0.7)' : 'var(--text-primary)'),
                // Left border accent for the active item
                borderLeft: isActive(item.to)
                  ? '3px solid var(--primary)' : '3px solid transparent',
              }}>
                {item.label}
              </Link>
            ))}

            {/* Mobile logout button — only shown when logged in */}
            {isAuthenticated && (
              <div style={{ padding: '12px 16px' }}>
                <button onClick={handleLogout} style={{
                  padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                  color: isDark ? '#fff' : 'var(--text-primary)',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'var(--bg)',
                  border: '1px solid var(--border)', cursor: 'pointer', width: '100%',
                }}>
                  {/* Show the user's first name next to "Log out" for clarity */}
                  Log out ({user?.name?.split(' ')[0]})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

// ============================================================
// NavLink — Helper Sub-Component for Desktop Nav Links
//
// This is a small component defined in the same file because
// it's only used here. It's not exported.
//
// Props:
//   to          — the URL to navigate to
//   children    — the link text
//   active      — whether this link is the current page
//   textColor   — color for inactive links (changes with isDark)
//   activeColor — color for the active link
// ============================================================
const NavLink = ({ to, children, active, textColor, activeColor }) => (
  <Link to={to} style={{
    padding: '7px 14px', borderRadius: '8px',
    fontSize: '14px', fontWeight: active ? '600' : '500',
    color: active ? activeColor : textColor,
    // Highlighted background when active
    background: active ? (activeColor === '#fff' ? 'rgba(255,255,255,0.1)' : 'var(--primary-light)') : 'transparent',
    transition: 'all 0.22s', letterSpacing: '-0.01em',
  }}>
    {children}
  </Link>
);

export default Navbar;
