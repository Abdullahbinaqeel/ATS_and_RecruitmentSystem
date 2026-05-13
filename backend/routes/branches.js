/*
 * ============================================================
 * routes/branches.js — Branch Management Routes
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Handles HTTP requests for managing company branch locations.
 *   Anyone can view branches (public GET). Only HR managers can
 *   create, update, or delete them (protected POST/PUT/DELETE).
 *
 * WHAT IS A ROUTE PARAMETER?
 *   In Express, a URL segment starting with ':' is a dynamic
 *   "route parameter". For example:
 *     PUT /api/branches/:id
 *   If the request is PUT /api/branches/64a1b2c3d4e5f6789012345a
 *   then req.params.id = "64a1b2c3d4e5f6789012345a"
 *   Express extracts it from the URL and puts it in req.params.
 *
 * WHAT IS req.params vs req.query vs req.body?
 *   req.params — dynamic URL segments (/users/:id → req.params.id)
 *   req.query  — URL query string (?search=dev → req.query.search)
 *   req.body   — JSON body of POST/PUT requests (parsed by express.json())
 *
 * MIDDLEWARE CHAIN PATTERN:
 *   router.post('/', protect, hrOnly, handler)
 *   Express runs middleware left to right:
 *     protect checks JWT → hrOnly checks role → handler does the work
 *   If protect fails, hrOnly and handler NEVER run.
 *
 * ROUTES:
 *   GET    /api/branches      — list all branches (no auth required)
 *   POST   /api/branches      — create a branch (HR only)
 *   PUT    /api/branches/:id  — update a branch (HR only)
 *   DELETE /api/branches/:id  — delete a branch (HR only)
 * ============================================================
 */

// ── Imports ──────────────────────────────────────────────────
const express = require('express');
const router = express.Router(); // mini-app for branch-related routes

// Branch model — gives us Branch.find(), Branch.create(), etc.
const Branch = require('../models/Branch');

// protect = must be logged in; hrOnly = must have role 'hr'
const { protect, hrOnly } = require('../middleware/auth');

// ── GET /api/branches — List all branches ────────────────────
/*
 * Public route — no authentication required.
 * Candidates need this to see where job openings are located
 * when browsing job listings. Anyone can call this endpoint.
 *
 * .sort({ name: 1 }) sorts alphabetically by name.
 * The '1' means ascending order (A to Z).
 * '-1' would be descending (Z to A).
 */
router.get('/', async (req, res) => {
  try {
    // Branch.find() with no arguments returns ALL branches.
    // We await because it's an async database query.
    const branches = await Branch.find().sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: branches.length, // helpful for the frontend to know total count
      data: branches
    });
  } catch (error) {
    console.error('Get branches error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching branches.',
      error: error.message
    });
  }
});

// ── POST /api/branches — Create a new branch ─────────────────
/*
 * HR-only route. Creates a new branch document in MongoDB.
 * Expected request body: { name, city, address }
 *
 * Middleware chain: protect → hrOnly → this handler
 *   - protect ensures the request has a valid JWT
 *   - hrOnly ensures the user has the 'hr' role
 *   - then this handler actually creates the branch
 */
router.post('/', protect, hrOnly, async (req, res) => {
  try {
    const { name, city, address } = req.body;

    // Validate that all three required fields are present
    if (!name || !city || !address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, city, and address for the branch.'
      });
    }

    // Branch.create() saves a new document and returns it
    const branch = await Branch.create({ name, city, address });

    // 201 Created — standard HTTP status for successful resource creation
    return res.status(201).json({
      success: true,
      data: branch
    });
  } catch (error) {
    /*
     * MongoDB error code 11000 means "duplicate key violation".
     * Our Branch schema has unique: true on 'name', so trying to
     * create a branch with a name that already exists throws this.
     * We catch it here to give a friendly error message instead of
     * a confusing MongoDB error dump.
     */
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A branch with this name already exists.'
      });
    }
    console.error('Create branch error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error creating branch.',
      error: error.message
    });
  }
});

// ── PUT /api/branches/:id — Update a branch ──────────────────
/*
 * HR-only route. Updates one or more fields of an existing branch.
 * :id in the URL is the MongoDB _id of the branch to update.
 *
 * We allow partial updates — HR can send just { city: "Lahore" }
 * without needing to re-send name and address.
 */
router.put('/:id', protect, hrOnly, async (req, res) => {
  try {
    const { name, city, address } = req.body;

    /*
     * Build the update object with only the fields that were provided.
     * If we checked (name !== undefined) we catch the case where
     * someone explicitly sends name: "" to clear it, vs. not sending
     * name at all (which would be undefined).
     */
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (city !== undefined) updates.city = city;
    if (address !== undefined) updates.address = address;

    /*
     * findByIdAndUpdate(id, update, options):
     *   req.params.id — the branch _id from the URL
     *   { $set: updates } — only update the listed fields
     *   { new: true }     — return the UPDATED doc, not the original
     *   { runValidators: true } — run Schema validations on new values
     */
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,     // the MongoDB _id extracted from the URL
      { $set: updates }, // only change the fields in 'updates'
      { new: true, runValidators: true }
    );

    // If null is returned, no document matched the given ID
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: branch
    });
  } catch (error) {
    // Handle duplicate name error again (same as in POST)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A branch with this name already exists.'
      });
    }
    console.error('Update branch error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating branch.',
      error: error.message
    });
  }
});

// ── DELETE /api/branches/:id — Delete a branch ───────────────
/*
 * HR-only route. Permanently deletes a branch from MongoDB.
 * We find the branch first so we can include its name in the
 * success message, which is friendlier than just returning an ID.
 *
 * NOTE: Deleting a branch doesn't automatically update Jobs that
 * reference it. Consider that before deleting active branches.
 */
router.delete('/:id', protect, hrOnly, async (req, res) => {
  try {
    /*
     * findByIdAndDelete() finds the document by _id and removes it.
     * It returns the deleted document (or null if not found).
     * We use the returned branch to get its name for the message.
     */
    const branch = await Branch.findByIdAndDelete(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Branch "${branch.name}" deleted successfully.`
    });
  } catch (error) {
    console.error('Delete branch error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting branch.',
      error: error.message
    });
  }
});

// ── Export ───────────────────────────────────────────────────
// server.js imports this and mounts it: app.use('/api/branches', branchRoutes)
module.exports = router;
