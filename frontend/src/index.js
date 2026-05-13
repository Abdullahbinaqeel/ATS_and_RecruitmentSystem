// ============================================================
// index.js — The Entry Point of the React Application
//
// This is the FIRST file that runs when the app starts.
// Its only job is to connect React to the HTML page.
//
// How it works:
//   1. The browser loads public/index.html
//   2. index.html has a single <div id="root"></div>
//   3. This file tells React to take control of that div
//   4. From that point, React renders everything inside it
//
// You will almost never need to change this file.
// ============================================================

// React is the core library — required in every React file
import React from 'react';

// ReactDOM connects React to the browser's actual HTML (the "DOM")
// React 18 introduced createRoot (older apps used ReactDOM.render)
import ReactDOM from 'react-dom/client';

// Global CSS file — applies styles to the entire app
import './index.css';

// App is our root component — the starting point of our component tree
import App from './App';

// ── Mount the App ─────────────────────────────────────────────
// document.getElementById('root') finds the <div id="root"> in public/index.html
// createRoot() tells React 18 "take control of this div"
const root = ReactDOM.createRoot(document.getElementById('root'));

// root.render() tells React WHAT to display inside that div
root.render(
  // React.StrictMode is a development-only tool
  // It doesn't change what users see — it only adds extra warnings in the console
  // to help catch common mistakes (like missing useEffect dependencies)
  <React.StrictMode>
    {/* App is the top-level component that contains everything else */}
    <App />
  </React.StrictMode>
);
