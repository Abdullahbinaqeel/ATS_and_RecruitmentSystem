// ============================================================
// context/ThemeContext.js — Dark / Light Mode Manager
//
// WHAT IT DOES:
//   Manages the global theme (dark or light) for the entire app.
//   The chosen theme is saved to localStorage so it persists
//   across page refreshes and browser sessions.
//
// HOW IT WORKS:
//   1. On first load, reads 'ats_theme' from localStorage
//      (defaults to 'light' if nothing is saved yet)
//   2. Applies  data-theme="dark"  or  data-theme="light"  to
//      <html> (document.documentElement). CSS picks this up:
//        [data-theme="dark"] { --bg: #0F1729; ... }
//      This overrides the :root CSS variables without touching any JSX.
//   3. Exports useTheme() hook so any component can:
//        const { theme, toggleTheme } = useTheme();
//
// WHERE IT'S USED:
//   - ThemeProvider wraps <App /> in index.js
//   - Navbar.jsx reads theme + toggleTheme to show the toggle button
// ============================================================

import React, { createContext, useContext, useEffect, useState } from 'react';

// The key used in localStorage — keeps it consistent across files
const STORAGE_KEY = 'ats_theme';

// ── Create Context ────────────────────────────────────────────
// createContext() creates a "channel" that any component in the tree
// can subscribe to via useContext(ThemeContext), without needing
// to pass props through every level of the component tree.
const ThemeContext = createContext({
  theme: 'light',      // Default value (used if no Provider is found — shouldn't happen)
  toggleTheme: () => {},
});

// ── Provider Component ────────────────────────────────────────
// ThemeProvider wraps the entire app and makes the theme context
// available to every child component inside it.
export const ThemeProvider = ({ children }) => {
  // Read the saved theme from localStorage on first render.
  // () => ... is a "lazy initializer" — runs only once, not on every render.
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'light';
  });

  // ── Apply Theme to <html> ─────────────────────────────────
  // Whenever `theme` changes, update the data-theme attribute on <html>.
  // CSS in index.css uses [data-theme="dark"] to override CSS variables.
  useEffect(() => {
    // Sets <html data-theme="dark"> or <html data-theme="light">
    document.documentElement.setAttribute('data-theme', theme);

    // Also save to localStorage so the preference survives page refreshes
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]); // [theme] = only run this effect when theme changes

  // ── Toggle Function ───────────────────────────────────────
  // Flips between 'light' and 'dark'.
  // prev => ... uses the functional update form of setState, which
  // guarantees we're reading the most recent state value.
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Pass theme and toggleTheme to all children via context
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ── Custom Hook ───────────────────────────────────────────────
// useTheme() is a shortcut so components don't need to import
// both useContext and ThemeContext. They just:
//   import { useTheme } from '../context/ThemeContext';
//   const { theme, toggleTheme } = useTheme();
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
