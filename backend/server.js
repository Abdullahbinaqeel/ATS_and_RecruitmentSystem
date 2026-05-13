/*
 * ============================================================
 * server.js — Main Entry Point for the ATS Backend
 * ============================================================
 * WHAT THIS FILE DOES:
 *   This is the first file Node.js runs when you start the server.
 *   It ties together every other piece of the backend:
 *     1. Loads environment variables (.env file)
 *     2. Connects to MongoDB via Mongoose
 *     3. Creates the Express app
 *     4. Registers global middleware (CORS, JSON parser)
 *     5. Mounts all route groups under /api/...
 *     6. Adds a 404 handler and a global error handler
 *     7. Starts listening for incoming HTTP requests
 *
 * WHAT IS EXPRESS?
 *   Express is a minimal Node.js web framework. It makes it easy
 *   to define HTTP routes (GET, POST, PUT, DELETE) and middleware
 *   (functions that run between a request and a response).
 *   Think of it as the skeleton of our API.
 *
 * HOW THE REQUEST LIFECYCLE WORKS:
 *   Client sends request
 *     → CORS middleware (allows cross-origin requests)
 *     → express.json() middleware (parses JSON body into req.body)
 *     → route matching (finds the right router file)
 *     → route-level middleware (protect, hrOnly)
 *     → route handler (does the actual work)
 *     → response sent back to client
 *
 * HOW TO START THE SERVER:
 *   Development (auto-restart on file changes):  npm run dev
 *   Production (no auto-restart):                npm start
 *
 * API ROUTE MAP:
 *   /api/auth/*          → routes/auth.js         (login, register, profile)
 *   /api/branches/*      → routes/branches.js      (branch CRUD)
 *   /api/jobs/*          → routes/jobs.js           (job listing CRUD)
 *   /api/applications/*  → routes/applications.js  (apply, review pipeline)
 *   /api/interviews/*    → routes/interviews.js     (interview scheduling)
 *   /api/hr/*            → routes/hr.js             (dashboard, email)
 * ============================================================
 */

// ── 1. Load Environment Variables ────────────────────────────
/*
 * dotenv reads the .env file from the project root and adds every
 * KEY=VALUE pair to the global process.env object.
 * For example, if .env contains: PORT=5000
 * then process.env.PORT === '5000' everywhere in the app.
 *
 * CRITICAL: This must be the VERY FIRST line before any other
 * import that might use process.env (like config/db.js or utils/email.js).
 * If dotenv runs after those imports, their process.env reads would
 * return undefined — silent failures that are hard to debug.
 */
require('dotenv').config();

// ── 2. Import Core Dependencies ───────────────────────────────
/*
 * require() loads a module (npm package or local file).
 * These are the foundation packages our server needs.
 */

// express — the web framework for building our REST API
const express = require('express');

/*
 * cors — Cross-Origin Resource Sharing middleware.
 * WHAT IS CORS?
 *   Browsers enforce a "same-origin policy": JavaScript running on
 *   http://localhost:3000 (the React frontend) is NOT allowed to
 *   make HTTP requests to http://localhost:5000 (our API) by default.
 *   This is a browser security feature.
 *
 *   The cors() middleware adds HTTP headers to our responses that
 *   tell the browser: "this API allows requests from other origins."
 *   Without cors(), the browser would block every API call from the
 *   frontend and the app would break silently with a CORS error.
 */
const cors = require('cors');

// Our database connection function (config/db.js)
const connectDB = require('./config/db');

// ── 3. Import All Route Files ─────────────────────────────────
/*
 * Each route file exports an Express Router — a mini-app managing
 * a group of related endpoints. We import them all here so we can
 * "mount" each one at a specific URL prefix in step 8 below.
 *
 * Mounting example: app.use('/api/auth', authRoutes)
 *   Any route defined as router.post('/login') in auth.js becomes
 *   POST /api/auth/login when mounted here.
 */
const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const interviewRoutes = require('./routes/interviews');
const hrRoutes = require('./routes/hr');

// ── 4. Connect to MongoDB ─────────────────────────────────────
/*
 * connectDB() is an async function that opens the connection to
 * MongoDB using the MONGO_URI from .env. We call it here, at
 * startup, before any requests come in.
 *
 * If the connection fails, connectDB() calls process.exit(1),
 * which stops the server immediately. We don't want a running
 * server with no database — every route would crash anyway.
 *
 * Note: we don't await connectDB() here (no 'await' keyword).
 * This is intentional — the Express server starts listening for
 * connections immediately. MongoDB connects in the background.
 * For a small app this is fine; the first DB query will wait
 * for the connection to be established automatically by Mongoose.
 */
connectDB();

// ── 5. Create the Express App ─────────────────────────────────
/*
 * express() creates the application object. Everything — middleware,
 * routes, error handlers — is registered on this 'app' object.
 * app.listen() at the bottom starts the actual HTTP server.
 */
const app = express();

// ── 6. Global Middleware ──────────────────────────────────────
/*
 * app.use(middleware) registers middleware that runs for EVERY
 * incoming request, before any route handler.
 * The order matters — middleware runs in the order it's registered.
 */

/*
 * cors({ origin: '*' }) allows requests from ANY domain.
 * '*' is a wildcard that means "any origin is welcome".
 *
 * WHY '*' IN DEVELOPMENT?
 *   During development, the frontend might be on localhost:3000,
 *   localhost:5173 (Vite), or any port. Using '*' avoids having to
 *   hardcode specific origins.
 *
 *   In production, you should restrict this to your actual
 *   frontend domain (e.g., origin: 'https://yourdomain.com')
 *   to prevent unauthorized websites from calling your API.
 */
app.use(cors({ origin: '*' }));

/*
 * express.json() parses the body of incoming requests that have
 * Content-Type: application/json.
 *
 * WHY IS THIS NEEDED?
 *   HTTP requests arrive as raw text. When the frontend sends:
 *     { "email": "test@example.com", "password": "123456" }
 *   the body arrives as a string. express.json() parses that string
 *   into a real JavaScript object so we can do req.body.email.
 *   Without this middleware, req.body would be undefined.
 */
app.use(express.json());

/*
 * express.urlencoded() parses form submissions where the Content-Type
 * is application/x-www-form-urlencoded (the format used when an
 * HTML <form> submits without enctype="multipart/form-data").
 *
 * { extended: true } allows nested objects in the form data
 * (uses the 'qs' library internally). false uses the simpler
 * Node.js built-in querystring module.
 *
 * For our API (which uses JSON), this rarely triggers — but it's
 * good practice to include it for robustness.
 */
app.use(express.urlencoded({ extended: true }));

// ── 7. Health Check Route ─────────────────────────────────────
/*
 * A "health check" endpoint is a simple route that returns 200 OK
 * to confirm the server is alive and responding.
 *
 * Cloud hosting platforms (Railway, Render, Heroku, AWS ECS, etc.)
 * ping this endpoint automatically. If it returns anything other
 * than 200, they consider the server "unhealthy" and may restart it.
 *
 * This route doesn't touch the database so it responds instantly
 * even if there's a database problem — useful for diagnosing
 * whether the issue is the server or the database.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'ATS Backend is running.',
    timestamp: new Date().toISOString() // ISO 8601 timestamp for when it was checked
  });
});

// ── 8. Mount API Routes ───────────────────────────────────────
/*
 * app.use(path, router) "mounts" a router at a base URL prefix.
 * All routes defined inside the router file are available under
 * that prefix.
 *
 * Think of it like a namespace:
 *   authRoutes has router.post('/login')
 *   Mounted at '/api/auth' → accessible as POST /api/auth/login
 *
 *   branchRoutes has router.get('/')
 *   Mounted at '/api/branches' → accessible as GET /api/branches
 */
app.use('/api/auth', authRoutes);          // login, register, profile, file uploads
app.use('/api/branches', branchRoutes);    // branch CRUD (locations)
app.use('/api/jobs', jobRoutes);           // job listing CRUD + search
app.use('/api/applications', applicationRoutes); // apply, view pipeline, status updates
app.use('/api/interviews', interviewRoutes);      // interview scheduling
app.use('/api/hr', hrRoutes);             // dashboard stats + email sending

// ── 9. Root Route (Sanity Check) ──────────────────────────────
/*
 * Visiting http://localhost:5000 in a browser returns a JSON
 * message confirming the API is running and listing all endpoints.
 * This is helpful for developers who navigate to the API URL.
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the ATS (Applicant Tracking System) API!',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: '/api/auth/*',
      branches: '/api/branches/*',
      jobs: '/api/jobs/*',
      applications: '/api/applications/*',
      interviews: '/api/interviews/*',
      hr: '/api/hr/*'
    }
  });
});

// ── 10. 404 Handler — Catch Unknown Routes ────────────────────
/*
 * If a request makes it past all the routes above without matching,
 * this middleware catches it and returns a 404 Not Found response.
 *
 * WHY NOT app.get('*', ...)? Using app.use() catches ALL HTTP methods
 * (GET, POST, PUT, DELETE, PATCH) for unknown routes.
 *
 * req.method    — "GET", "POST", etc.
 * req.originalUrl — the full URL path that was requested
 * This gives a helpful error message like "Route not found: POST /api/nonexistent"
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ── 11. Global Error Handler ──────────────────────────────────
/*
 * WHAT IS AN ERROR HANDLER?
 *   In Express, a middleware with EXACTLY FOUR parameters
 *   (err, req, res, next) is recognized as an error handler.
 *   The presence of 4 parameters (not 3) is what tells Express
 *   "this is for errors, not regular requests."
 *
 * HOW ERRORS REACH HERE:
 *   1. When an error is thrown inside an async route handler and
 *      not caught by a try/catch, it bubbles up.
 *   2. When a route calls next(err) with an error object.
 *
 * In this app, all route handlers have their own try/catch blocks,
 * so this handler mainly catches unexpected errors that slip through.
 *
 * err.stack — the full JavaScript stack trace (shows where the error occurred)
 * err.status — a status code if set on the error object (e.g., 404, 403)
 * err.message — the human-readable error description
 */
app.use((err, req, res, next) => {
  // Log the full stack trace on the server for debugging
  console.error('Unhandled error:', err.stack);
  // Send a JSON error response to the client
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ── 12. Start the HTTP Server ─────────────────────────────────
/*
 * process.env.PORT is set by cloud platforms (Heroku, Railway, Render).
 * They assign a random port and pass it via environment variable.
 * If not set (local development), we fall back to port 5000.
 *
 * app.listen(port, callback) binds to the specified port and starts
 * accepting HTTP connections. The callback runs when the server
 * is ready — we log a banner to confirm everything started correctly.
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('==============================================');
  console.log(`  ATS Backend Server`);
  console.log('==============================================');
  console.log(`  Status  : Running`);
  console.log(`  Port    : ${PORT}`);
  console.log(`  Mode    : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  URL     : http://localhost:${PORT}`);
  console.log(`  Health  : http://localhost:${PORT}/api/health`);
  console.log('==============================================');
  console.log('');
});

/*
 * Export the app so testing frameworks (Jest, Supertest) can import
 * it without actually starting a server on a real port. This is a
 * common pattern for writing unit/integration tests in Node.js.
 */
module.exports = app;
