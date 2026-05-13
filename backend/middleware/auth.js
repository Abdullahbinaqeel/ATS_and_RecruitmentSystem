/*
 * ============================================================
 * middleware/auth.js — Authentication & Authorization Middleware
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Exports two "middleware" functions that protect routes:
 *     1. protect  — verifies the user is logged in (has a valid JWT)
 *     2. hrOnly   — verifies the logged-in user has the 'hr' role
 *
 * WHAT IS MIDDLEWARE?
 *   In Express, middleware is a function that sits between an
 *   incoming HTTP request and the final route handler. Every
 *   middleware receives three arguments:
 *     - req  (request)  : contains headers, body, URL params, etc.
 *     - res  (response) : used to send data back to the client
 *     - next            : a function you call to say "I'm done,
 *                         pass control to the next middleware or
 *                         the actual route handler"
 *
 *   If you call res.json() or res.status().json() instead of
 *   next(), you short-circuit the chain — the route handler
 *   never runs. We use this to block unauthorized requests.
 *
 * WHAT IS A JWT (JSON Web Token)?
 *   A JWT is a compact, signed string that encodes data (a
 *   "payload"). When a user logs in, we create a JWT containing
 *   their MongoDB user ID and sign it with a secret key that
 *   only our server knows.
 *
 *   The client (browser) stores this token (usually in
 *   localStorage) and sends it with every subsequent request
 *   in the Authorization header:
 *     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
 *
 *   We verify the signature to confirm:
 *     a) The token was created by us (not forged by anyone else)
 *     b) The token has not expired
 *     c) The token has not been tampered with
 *
 * HOW IT FITS IN THE SYSTEM:
 *   Routes that need protection import { protect, hrOnly } from
 *   this file and list them as middleware before the handler:
 *     router.get('/secret', protect, hrOnly, secretHandler)
 *   protect runs first, then hrOnly, then secretHandler.
 * ============================================================
 */

// ── Imports ──────────────────────────────────────────────────
// jsonwebtoken lets us create (sign) and verify JWTs.
const jwt = require('jsonwebtoken');

// We need the User model so we can look up the user in MongoDB
// using the ID stored inside the token payload.
const User = require('../models/User');

// ── protect ──────────────────────────────────────────────────
/*
 * protect is the "are you logged in?" check.
 * It reads the JWT from the Authorization header, verifies it,
 * fetches the matching user from MongoDB, and attaches the user
 * to req.user so downstream handlers can use it.
 *
 * If anything fails (missing token, expired, invalid, user not
 * found) we return 401 Unauthorized immediately — the actual
 * route handler never executes.
 *
 * 401 = "You need to authenticate first"
 * 403 = "We know who you are but you're not allowed" (used in hrOnly)
 */
const protect = async (req, res, next) => {
  // async because we're doing await calls (JWT verify, DB lookup)
  try {
    // We'll store the raw token string here once we find it.
    let token;

    /*
     * The Authorization header format is: "Bearer <token>"
     * We first check that the header exists AND starts with
     * the word "Bearer " (with a space).
     * This prevents accidental matches like other auth schemes.
     */
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      /*
       * .split(' ') splits "Bearer eyJhbG..." into:
       *   ['Bearer', 'eyJhbG...']
       * Index [1] gives us just the token part after the space.
       */
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token was found, the user is not authenticated.
    // Return 401 and stop — don't call next().
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided. Please log in.'
      });
    }

    /*
     * jwt.verify() does two things:
     *   1. Checks the token's signature using our JWT_SECRET.
     *      If the token was created with a different secret
     *      (i.e., someone tried to forge it), this throws.
     *   2. Checks the expiration time embedded in the token.
     *      If it has expired, this throws a TokenExpiredError.
     *
     * If both checks pass, it returns the decoded payload object
     * that we originally put inside the token when creating it.
     * Our token payload is { id: user._id }, so decoded.id
     * gives us the MongoDB user ID.
     */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /*
     * Now we look up the actual user in MongoDB using the ID
     * from the token. We do this (instead of trusting the token
     * blindly) to handle cases where a user was deleted after
     * their token was issued.
     *
     * .select('-password') tells Mongoose to return all fields
     * EXCEPT password. The '-' prefix means "exclude this field".
     * We never want the hashed password floating around in memory
     * beyond where it's absolutely necessary.
     */
    const user = await User.findById(decoded.id).select('-password');

    // The user might have been deleted since the token was issued.
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user not found (token may be stale).'
      });
    }

    /*
     * Attach the full user document to req.user.
     * This makes the user's data (._id, .role, .name, etc.)
     * available to any route handler that runs after protect.
     * This is the key "hand-off" between middleware and handlers.
     */
    req.user = user;

    /*
     * next() passes control to the next function in the chain.
     * If a route is defined as:
     *   router.get('/me', protect, myHandler)
     * calling next() here causes myHandler to run next.
     */
    next();
  } catch (error) {
    /*
     * jwt.verify() throws different error types:
     *   - JsonWebTokenError  : invalid token (tampered, malformed)
     *   - TokenExpiredError  : token is past its expiry date
     * Both get caught here and result in a 401 response.
     */
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized — invalid or expired token. Please log in again.'
    });
  }
};

// ── hrOnly ───────────────────────────────────────────────────
/*
 * hrOnly checks that the logged-in user has the 'hr' role.
 * It MUST come AFTER protect in any middleware chain because
 * it relies on req.user being set by protect first.
 *
 * Usage in a route:
 *   router.post('/jobs', protect, hrOnly, createJobHandler)
 *   protect runs → sets req.user → hrOnly runs → handler runs
 *
 * This is NOT async because we're not doing any I/O — we just
 * read a field from an object that's already in memory.
 */
const hrOnly = (req, res, next) => {
  /*
   * req.user is guaranteed to exist at this point because
   * protect ran before hrOnly and would have blocked the request
   * if the user wasn't authenticated.
   *
   * We check req.user.role which is stored in the database
   * (User schema has role: 'candidate' | 'hr').
   */
  if (req.user && req.user.role === 'hr') {
    // User is an HR manager — allow the request to proceed
    next();
  } else {
    /*
     * 403 Forbidden: we know WHO the user is (they passed protect)
     * but they don't have PERMISSION to do this action.
     * This is different from 401, which means "we don't know who
     * you are at all".
     */
    return res.status(403).json({
      success: false,
      message: 'Access denied — HR role required for this action.'
    });
  }
};

// ── Export ───────────────────────────────────────────────────
// Export both middleware functions so routes can import them.
// Destructuring import: const { protect, hrOnly } = require('./middleware/auth')
module.exports = { protect, hrOnly };
