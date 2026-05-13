// ============================================================
// api/axios.js — Pre-Configured HTTP Client
//
// WHY THIS FILE EXISTS:
// Every time we talk to the backend (fetching jobs, logging in, etc.),
// we need to make HTTP requests. Axios is a popular library for this.
//
// Instead of repeating the base URL and authentication header in
// every single component, we create ONE configured Axios instance here.
// All other files import this "api" object instead of raw Axios.
//
// Think of it as setting up a phone line that:
//   1. Always dials the right area code (baseURL)
//   2. Always introduces itself with the user's ID card (Bearer token)
//   3. Hangs up gracefully if the ID card is rejected (401 handler)
//
// WHERE IT'S USED:
//   Imported in almost every page/component that talks to the backend.
// ============================================================

import axios from 'axios';

// ── Create a Custom Axios Instance ───────────────────────────
// axios.create() makes a new axios object with preset configuration.
// process.env.REACT_APP_API_URL reads a value from the .env file.
// If that variable isn't set, we fall back to localhost:5000 (local dev server).
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    // Tell the server "I'm sending JSON data, not a form or file upload"
    'Content-Type': 'application/json',
  },
});

// ============================================================
// REQUEST INTERCEPTOR
//
// An interceptor is a "hook" that runs automatically before or
// after every request/response. Think of it as middleware.
//
// This REQUEST interceptor runs BEFORE every outgoing request.
// Its job: attach the user's JWT (login token) to the request header.
//
// WHY? Protected API routes require a valid token. If we didn't
// attach it here, we'd have to manually add it in every API call,
// which would be very repetitive and error-prone.
// ============================================================
api.interceptors.request.use(
  (config) => {
    // localStorage is the browser's key-value storage.
    // When the user logs in, we save their token there (see AuthContext.js).
    const token = localStorage.getItem('ats_token');

    if (token) {
      // "Bearer" is a standard format for JWT tokens in HTTP headers.
      // The server reads this header to know WHO is making the request.
      // Example: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
      config.headers.Authorization = `Bearer ${token}`;
    }

    // We MUST return config — this is what actually gets sent to the server
    return config;
  },
  (error) => {
    // If setting up the request itself fails (rare), reject with the error
    // so any .catch() in the calling code can handle it
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
//
// This RESPONSE interceptor runs AFTER every response is received.
// Its job: handle global errors, specifically 401 Unauthorized.
//
// WHY? JWT tokens expire. If the token is expired, the server returns
// status 401. We want to automatically log the user out when this
// happens, instead of leaving them in a broken logged-in state.
// ============================================================
api.interceptors.response.use(
  (response) => {
    // If the response is successful (status 200–299), just pass it through.
    // No changes needed — the calling code gets the response as-is.
    return response;
  },
  (error) => {
    // error.response is the server's response object.
    // If it's a 401 (Unauthorized), the token is invalid or expired.
    if (error.response && error.response.status === 401) {
      // Remove the stale token and user data from localStorage
      localStorage.removeItem('ats_token');
      localStorage.removeItem('ats_user');

      // Only redirect to login if the user is not already on the login page.
      // (Avoids an infinite redirect loop)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Still reject the promise so that the calling code's .catch() block runs.
    // We don't want to silently swallow ALL errors — just handle the 401 globally.
    return Promise.reject(error);
  }
);

// Export the configured instance so other files can import it as "api"
export default api;
