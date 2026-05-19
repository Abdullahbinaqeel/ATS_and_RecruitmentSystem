/*
 * ============================================================
 * routes/auth.js — Authentication Routes
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Handles all user authentication actions: registering a new
 *   account, logging in, viewing your profile, updating your
 *   profile, and uploading documents/photos.
 *
 * WHAT IS AN EXPRESS ROUTER?
 *   An Express Router is a mini-app that manages a group of
 *   related routes. We define routes on the router here, then
 *   "mount" it in server.js under the /api/auth prefix.
 *   So router.post('/login') becomes POST /api/auth/login.
 *   This keeps code organized — all auth logic lives here.
 *
 * JWT AUTHENTICATION FLOW (THE FULL PICTURE):
 *   Step 1 — Register or Login (routes below):
 *     Client sends email + password → Server verifies them →
 *     Server creates a JWT (signed token containing user._id) →
 *     Server sends the JWT to the client.
 *
 *   Step 2 — Subsequent requests:
 *     Client stores the token (usually in localStorage).
 *     Client sends it in every request header:
 *       Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
 *
 *   Step 3 — Protected routes:
 *     The 'protect' middleware reads the header, verifies the
 *     token, and attaches the user to req.user.
 *     If the token is missing or invalid, it returns 401.
 *
 * ROUTES IN THIS FILE:
 *   POST /api/auth/register            — create new account
 *   POST /api/auth/login               — log in, receive JWT
 *   GET  /api/auth/me                  — get current user data
 *   PUT  /api/auth/profile             — update profile info
 *   POST /api/auth/upload/resume       — upload resume PDF
 *   POST /api/auth/upload/cover-letter — upload cover letter
 *   POST /api/auth/upload/profile-pic  — upload profile picture
 * ============================================================
 */

// ── Imports ──────────────────────────────────────────────────
// express is needed to create the Router instance
const express = require('express');

/*
 * express.Router() creates a mini-app for managing routes.
 * All routes defined on 'router' will be prefixed with
 * whatever path server.js mounts this file at (/api/auth).
 */
const router = express.Router();

// jsonwebtoken is used to sign (create) and verify JWTs
const jwt = require('jsonwebtoken');

// User model so we can query the 'users' collection in MongoDB
const User = require('../models/User');

// protect middleware — blocks requests without a valid JWT
const { protect } = require('../middleware/auth');

// The three upload middleware instances for different file types
const { uploadResume, uploadCoverLetter, uploadProfilePic } = require('../middleware/upload');

// ── Helper: Generate JWT ─────────────────────────────────────
/*
 * generateToken creates and returns a signed JWT for a given userId.
 *
 * jwt.sign(payload, secret, options):
 *   payload      — data to encode inside the token { id: userId }
 *   JWT_SECRET   — our private secret key used to sign the token.
 *                  Anyone with this key can create valid tokens,
 *                  so it MUST stay in .env and never be public.
 *   expiresIn    — the token stops being valid after 7 days.
 *                  After expiry, protect middleware returns 401
 *                  and the user must log in again.
 *
 * The resulting token is a string like: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },          // payload: what we embed in the token
    process.env.JWT_SECRET,  // secret key to sign with
    { expiresIn: '7d' }      // token lifespan
  );
};

// ── POST /api/auth/register ──────────────────────────────────
/*
 * Registers a new user account.
 * The user sends: { name, email, password, role? }
 * We validate, check for duplicates, create the user,
 * and return a JWT so they're instantly "logged in".
 *
 * HTTP 201 Created — used when a new resource is successfully created.
 * HTTP 400 Bad Request — used when the client sends invalid data.
 * HTTP 500 Internal Server Error — unexpected server-side failure.
 */
router.post('/register', async (req, res) => {
  try {
    /*
     * req.body contains the JSON data sent by the client.
     * express.json() middleware (set up in server.js) parses it.
     * Without that middleware, req.body would be undefined.
     */
    const { name, email, password, role } = req.body;

    // Server-side validation: never trust data from the client alone
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    /*
     * User.findOne({ email }) searches the 'users' collection for
     * a document where email matches. Returns null if not found.
     * We await because it's a database query (async operation).
     */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // 400 because it's a client error — they used an existing email
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    /*
     * User.create({ ... }) saves a new user document to MongoDB.
     * The pre-save hook in User.js automatically hashes the password
     * before it reaches the database — we never store plain text.
     *
     * We only allow 'hr' or 'candidate' for the role, defaulting
     * to 'candidate'. This prevents a user from setting role: 'superadmin'.
     */
    const user = await User.create({
      name,
      email,
      password, // hashed by the pre-save hook in User.js
      role: role === 'hr' ? 'hr' : 'candidate'
    });

    // Generate a JWT using the new user's MongoDB _id
    const token = generateToken(user._id);

    /*
     * Return 201 Created with the token and safe user data.
     * Notice we manually list the fields to return — we DO NOT
     * spread the whole user object because that would include
     * the hashed password. Always be explicit about what you send.
     */
    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          profilePicture: user.profilePicture,
          resumeUrl: user.resumeUrl,
          coverLetterUrl: user.coverLetterUrl,
          education: user.education,
          skills: user.skills,
          jobPreferences: user.jobPreferences,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: error.message
    });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
/*
 * Authenticates an existing user.
 * The user sends: { email, password }
 * We find the user, compare passwords, and return a JWT.
 *
 * HTTP 401 Unauthorized — credentials are wrong or missing.
 * We intentionally give vague errors ("Invalid email or password")
 * to prevent "user enumeration" attacks where an attacker probes
 * whether a given email exists in our system.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    /*
     * Find the user by email. Unlike in the 'me' route, we need
     * the password here so we can run comparePassword().
     * The User schema doesn't hide the password by default,
     * so it's included in this query result.
     */
    const user = await User.findOne({ email });

    if (!user) {
      // Use the same message as wrong password — don't reveal if email exists
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    /*
     * user.comparePassword() is the instance method we defined in
     * User.js. It runs bcrypt.compare() internally — hashing the
     * entered password and checking if it matches the stored hash.
     * Returns true if they match, false otherwise.
     */
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Both email and password are valid — generate and return JWT
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          profilePicture: user.profilePicture,
          resumeUrl: user.resumeUrl,
          coverLetterUrl: user.coverLetterUrl,
          education: user.education,
          skills: user.skills,
          jobPreferences: user.jobPreferences,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      error: error.message
    });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
/*
 * Returns the currently logged-in user's profile data.
 * Uses the 'protect' middleware — no valid JWT means no access.
 *
 * req.user is attached by the protect middleware after it
 * verifies the JWT and fetches the user from MongoDB.
 * It already excludes the password field (.select('-password')).
 *
 * The frontend calls this to hydrate user data on page load
 * when the user already has a stored JWT.
 */
router.get('/me', protect, async (req, res) => {
  try {
    // req.user was set by protect — just return it directly
    return res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get me error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error.',
      error: error.message
    });
  }
});

// ── PUT /api/auth/profile ─────────────────────────────────────
/*
 * Updates the logged-in user's profile information.
 * Only allows name, phone, and address — NOT email or password
 * (those would need separate, more careful flows).
 *
 * We build an 'updates' object with only the fields provided
 * so a partial update (just name, for example) doesn't wipe
 * out phone and address.
 */
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, address, education, skills, jobPreferences } = req.body;

    // Collect only the fields that were actually sent in the request
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (education !== undefined) updates.education = education;
    if (skills !== undefined) updates.skills = skills;
    if (jobPreferences !== undefined) updates.jobPreferences = jobPreferences;

    /*
     * findByIdAndUpdate(id, update, options):
     *   id            — which document to find (req.user._id from protect)
     *   { $set: updates } — $set only updates the specified fields,
     *                       leaving everything else untouched.
     *                       Without $set, MongoDB would replace the
     *                       entire document with just these fields!
     *   { new: true } — return the updated document, not the original
     *   { runValidators: true } — apply Schema validation rules to
     *                            the new values (e.g., minlength on name)
     *   .select('-password') — exclude password from the returned doc
     */
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating profile.',
      error: error.message
    });
  }
});

// ── POST /api/auth/upload/resume ─────────────────────────────
/*
 * Uploads a resume PDF to Cloudinary and saves the URL to the
 * user's profile in MongoDB.
 *
 * Middleware chain:
 *   1. protect           — check the user is logged in
 *   2. uploadResume.single('resume') — parse the multipart/form-data
 *                          upload, send file to Cloudinary, put
 *                          file info in req.file
 *   3. this handler      — save req.file.path (Cloudinary URL) to DB
 *
 * The frontend must send the file in a field named 'resume'
 * (matching the string passed to .single()):
 *   <input type="file" name="resume" accept=".pdf" />
 */
router.post(
  '/upload/resume',
  protect,
  uploadResume.single('resume'), // 'resume' = the HTML form field name
  async (req, res) => {
    try {
      // req.file is set by multer if a file was successfully uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please attach a PDF file.'
        });
      }

      /*
       * req.file.path is the Cloudinary URL of the uploaded file.
       * multer-storage-cloudinary sets this automatically after
       * uploading to Cloudinary. It's a full HTTPS URL like:
       * "https://res.cloudinary.com/myapp/raw/upload/v123.../resume.pdf"
       */
      const resumeUrl = req.file.path;

      // Save this Cloudinary URL to the user's MongoDB document
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { resumeUrl } }, // only update the resumeUrl field
        { new: true }            // return the updated user
      ).select('-password');

      return res.status(200).json({
        success: true,
        data: { resumeUrl, user: updatedUser }
      });
    } catch (error) {
      console.error('Resume upload error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error during resume upload.',
        error: error.message
      });
    }
  }
);

// ── POST /api/auth/upload/cover-letter ───────────────────────
/*
 * Same pattern as resume upload, but for cover letters.
 * uploadCoverLetter accepts PDF and DOCX files.
 * Frontend form field name: 'coverLetter'
 */
router.post(
  '/upload/cover-letter',
  protect,
  uploadCoverLetter.single('coverLetter'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please attach a PDF or DOCX file.'
        });
      }

      const coverLetterUrl = req.file.path; // Cloudinary URL from multer

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverLetterUrl } },
        { new: true }
      ).select('-password');

      return res.status(200).json({
        success: true,
        data: { coverLetterUrl, user: updatedUser }
      });
    } catch (error) {
      console.error('Cover letter upload error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error during cover letter upload.',
        error: error.message
      });
    }
  }
);

// ── POST /api/auth/upload/profile-pic ────────────────────────
/*
 * Same pattern as resume upload, but for profile pictures.
 * uploadProfilePic accepts JPG and PNG images, and Cloudinary
 * automatically resizes them to 400x400 (see middleware/upload.js).
 * Frontend form field name: 'profilePic'
 */
router.post(
  '/upload/profile-pic',
  protect,
  uploadProfilePic.single('profilePic'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please attach a JPG or PNG image.'
        });
      }

      const profilePicture = req.file.path; // Cloudinary URL for the image

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { profilePicture } },
        { new: true }
      ).select('-password');

      return res.status(200).json({
        success: true,
        data: { profilePicture, user: updatedUser }
      });
    } catch (error) {
      console.error('Profile pic upload error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error during profile picture upload.',
        error: error.message
      });
    }
  }
);

// ── Export ───────────────────────────────────────────────────
// Export the router so server.js can mount it with:
// app.use('/api/auth', authRoutes)
module.exports = router;
