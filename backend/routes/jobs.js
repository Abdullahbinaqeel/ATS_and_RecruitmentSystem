/*
 * ============================================================
 * routes/jobs.js — Job Listing Routes
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Handles all HTTP requests related to job postings.
 *   Public routes let anyone browse jobs. Protected routes
 *   let HR manage (create/update/delete) job postings.
 *
 * ROUTES:
 *   GET    /api/jobs        — list/search all jobs (public)
 *   GET    /api/jobs/:id    — get one job by its ID (public)
 *   POST   /api/jobs        — create a new job posting (HR only)
 *   PUT    /api/jobs/:id    — update a job posting (HR only)
 *   DELETE /api/jobs/:id    — delete a job posting (HR only)
 *
 * FILTERING WITH QUERY PARAMETERS:
 *   Query parameters are the key=value pairs after '?' in a URL.
 *   Example: GET /api/jobs?branch=64ab...&search=developer&status=open
 *   Express collects them in req.query:
 *     req.query.branch   = "64ab..."
 *     req.query.search   = "developer"
 *     req.query.status   = "open"
 *
 *   Supported filters:
 *     ?branch=<id>       — filter by branch ID
 *     ?department=<name> — case-insensitive department search
 *     ?status=open|closed — filter by job status
 *     ?search=<keyword>  — full-text search in title & department
 *
 * WHAT IS .populate()?
 *   Jobs store branch and postedBy as MongoDB ObjectIds (just IDs).
 *   .populate('branch') replaces the ID with the actual Branch document.
 *   This way the frontend receives human-readable data:
 *     Without populate: { branch: "64ab1c2d..." }
 *     With populate:    { branch: { name: "Lahore", city: "Lahore" } }
 *
 * HOW IT FITS IN THE SYSTEM:
 *   - Candidates call GET /api/jobs to browse openings
 *   - Candidates call GET /api/jobs/:id to see full job details
 *   - HR managers call POST/PUT/DELETE to manage the job board
 *   - routes/applications.js checks if a job is open before allowing apply
 * ============================================================
 */

// ── Imports ──────────────────────────────────────────────────
const express = require('express');
const router = express.Router();

// Job model for querying the 'jobs' collection
const Job = require('../models/Job');

// Middleware: protect = logged in, hrOnly = has 'hr' role
const { protect, hrOnly } = require('../middleware/auth');

// ── GET /api/jobs — List all jobs with optional filters ───────
/*
 * Public route — no authentication required.
 * Builds a dynamic MongoDB filter based on what query params
 * the client sent, then runs one query with all the filters.
 */
router.get('/', async (req, res) => {
  try {
    /*
     * We build a 'filter' object incrementally.
     * Job.find(filter) will only return documents that match ALL
     * the conditions we add. Starting with {} means "no filter yet
     * — return everything" (like SQL's SELECT * with no WHERE).
     */
    const filter = {};

    /*
     * If ?branch=<id> is in the URL, filter to only jobs at that branch.
     * req.query.branch is the branch's MongoDB _id as a string.
     * Mongoose automatically converts the string to ObjectId for comparison.
     */
    if (req.query.branch) {
      filter.branch = req.query.branch;
    }

    /*
     * If ?department=<name> is in the URL, do a case-insensitive search.
     * $regex is MongoDB's regular expression operator — it matches
     * documents where the field value contains the pattern.
     * $options: 'i' makes it case-insensitive so "engineering" matches
     * "Engineering" and "ENGINEERING".
     */
    if (req.query.department) {
      filter.department = { $regex: req.query.department, $options: 'i' };
    }

    /*
     * Status filter: default to 'open' so candidates see active jobs.
     * HR can pass ?status=closed or ?status=all to see other listings.
     * Note: ?status=all is NOT a valid schema value, so it won't match
     * any document — effectively the filter has no status restriction.
     */
    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      // No status param provided — default to showing only open jobs
      if (req.query.status !== 'all') {
        filter.status = 'open';
      }
    }

    /*
     * Full-text search with $text.
     * This only works because we created a text index in Job.js:
     *   jobSchema.index({ title: 'text', department: 'text' })
     *
     * $text: { $search: 'developer' } efficiently finds all jobs
     * where title or department contains the word "developer".
     * MongoDB's text index handles stemming (develop, developer,
     * developing all match "develop").
     */
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    /*
     * Job.find(filter) applies all the conditions we built above.
     *
     * .populate('branch', 'name city address') replaces the branch
     * ObjectId with a partial Branch document containing only
     * name, city, and address fields (the second argument is the
     * field selector — like SQL's SELECT name, city, address).
     *
     * .populate('postedBy', 'name email') does the same for the HR user.
     *
     * .sort({ createdAt: -1 }) shows newest jobs first.
     * -1 = descending order (newest timestamp first).
     */
    const jobs = await Job.find(filter)
      .populate('branch', 'name city address')
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('Get jobs error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching jobs.',
      error: error.message
    });
  }
});

// ── GET /api/jobs/:id — Get a single job by ID ───────────────
/*
 * Public route. Returns full details for one specific job.
 * Used when a candidate clicks on a job in the listing to
 * see the full description, requirements, and apply button.
 */
router.get('/:id', async (req, res) => {
  try {
    /*
     * findById(id) is shorthand for findOne({ _id: id }).
     * req.params.id is the :id segment from the URL.
     * We populate both branch and postedBy for complete details.
     */
    const job = await Job.findById(req.params.id)
      .populate('branch', 'name city address')
      .populate('postedBy', 'name email');

    // null means no document with that _id was found in MongoDB
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Get job error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching job.',
      error: error.message
    });
  }
});

// ── POST /api/jobs — Create a new job posting ─────────────────
/*
 * HR-only route. Creates a new job in the database.
 * Expected body: { title, department, description, requirements, branch, seats }
 *
 * requirements is optional — HR might not fill it in immediately.
 * We default it to [] if not provided.
 */
router.post('/', protect, hrOnly, async (req, res) => {
  try {
    const { title, department, description, requirements, branch, seats, status } = req.body;

    // Validate required fields before attempting DB write
    if (!title || !department || !description || !branch || !seats) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, department, description, branch, and seats.'
      });
    }

    /*
     * req.user._id is the logged-in HR user's MongoDB _id.
     * protect middleware set this by verifying the JWT.
     * We store it as postedBy so HR team knows who created this job.
     */
    const job = await Job.create({
      title,
      department,
      description,
      requirements: requirements || [], // use empty array if not provided
      branch,
      seats,
      status: status || 'open', // default to 'open' if not specified
      postedBy: req.user._id    // the logged-in HR user's ID
    });

    /*
     * After creating, we populate the references so the response
     * contains the full branch object and poster name — not just IDs.
     * This saves the frontend from making extra API calls.
     * .populate() on a document instance works the same as on a query.
     */
    await job.populate('branch', 'name city address');
    await job.populate('postedBy', 'name email');

    return res.status(201).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Create job error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error creating job.',
      error: error.message
    });
  }
});

// ── PUT /api/jobs/:id — Update a job posting ─────────────────
/*
 * HR-only route. Updates any combination of job fields.
 * Partial updates are supported — HR can change just the status
 * without resending all other fields.
 */
router.put('/:id', protect, hrOnly, async (req, res) => {
  try {
    const { title, department, description, requirements, branch, seats, status } = req.body;

    // Build the update object from only the provided fields
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (department !== undefined) updates.department = department;
    if (description !== undefined) updates.description = description;
    if (requirements !== undefined) updates.requirements = requirements;
    if (branch !== undefined) updates.branch = branch;
    if (seats !== undefined) updates.seats = seats;
    if (status !== undefined) updates.status = status;

    /*
     * Find the job by ID, apply $set updates, return the new doc,
     * and run schema validators. Then immediately populate the
     * referenced fields for the response.
     */
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('branch', 'name city address')
      .populate('postedBy', 'name email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Update job error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating job.',
      error: error.message
    });
  }
});

// ── DELETE /api/jobs/:id — Delete a job posting ──────────────
/*
 * HR-only route. Permanently deletes a job from MongoDB.
 *
 * NOTE: Deleting a job does NOT automatically delete associated
 * Applications. In production you'd want to handle orphaned
 * applications (e.g., cascade delete or a cleanup job).
 */
router.delete('/:id', protect, hrOnly, async (req, res) => {
  try {
    // findByIdAndDelete returns the deleted document or null
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Job "${job.title}" deleted successfully.`
    });
  } catch (error) {
    console.error('Delete job error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting job.',
      error: error.message
    });
  }
});

// ── Export ───────────────────────────────────────────────────
// server.js mounts this with: app.use('/api/jobs', jobRoutes)
module.exports = router;
