/*
 * ============================================================
 * routes/applications.js — Job Application Routes
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Handles all actions related to job applications — the core
 *   workflow of the ATS. Candidates apply, HR reviews and updates.
 *
 * ROUTES:
 *   POST   /api/applications             — candidate applies to a job
 *   GET    /api/applications/my          — candidate views their own applications
 *   GET    /api/applications/job/:jobId  — HR views all applicants for a job
 *   PUT    /api/applications/:id/status  — HR moves an application through the pipeline
 *   DELETE /api/applications/:id         — candidate withdraws an application
 *
 * IMPORTANT — ROUTE ORDER MATTERS IN EXPRESS:
 *   Express matches routes top-to-bottom in the order they're defined.
 *   GET /my must be defined BEFORE any GET /:id route (if one existed).
 *   If /:id came first, Express would try to treat "my" as an ID string
 *   and look for a document with _id of "my" — which would fail.
 *   Always put specific routes before parameterized ones.
 *
 * WHO CAN DO WHAT:
 *   - Candidates (any logged-in user): apply (POST), view own (GET /my), withdraw (DELETE)
 *   - HR only: view all applicants for a job (GET /job/:jobId), update status (PUT)
 *
 * THE APPLICATION LIFECYCLE:
 *   submitted → under_review → shortlisted → interview_scheduled → selected
 *                                   ↓
 *                                rejected  (can happen at any stage)
 *
 * HOW IT FITS IN THE SYSTEM:
 *   - models/Application.js  : defines the Application schema
 *   - routes/interviews.js   : reads applications to schedule interviews
 *   - routes/hr.js           : queries applications for dashboard stats
 * ============================================================
 */

// ── Imports ──────────────────────────────────────────────────
const express = require('express');
const router = express.Router();

// Models we need to query
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User'); // imported but primarily used via populate
const { protect, hrOnly } = require('../middleware/auth');

// ── POST /api/applications — Candidate applies to a job ───────
/*
 * Any logged-in user can apply. We:
 *   1. Validate the jobId was provided
 *   2. Check the job exists and is open
 *   3. Check the candidate hasn't already applied
 *   4. Create the Application, snapshotting file URLs from the profile
 */
router.post('/', protect, async (req, res) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a jobId to apply.'
      });
    }

    // Verify the job exists in the database
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    // Verify the job is still accepting applications
    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications.'
      });
    }

    /*
     * Check for an existing application from this candidate to this job.
     * The compound unique index in Application.js would catch this anyway,
     * but by checking first we can give a much friendlier error message
     * than the raw MongoDB duplicate key error.
     *
     * Application.findOne({ candidate, job }) looks for a document where
     * BOTH conditions are true simultaneously.
     */
    const existingApplication = await Application.findOne({
      candidate: req.user._id, // the logged-in user
      job: jobId
    });
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this job.'
      });
    }

    /*
     * Create the Application document.
     *
     * WHY COPY resumeUrl AND coverLetterUrl FROM THE USER PROFILE?
     *   At apply-time, we snapshot the candidate's current documents.
     *   If the candidate uploads a new resume next week, HR should still
     *   see the resume that was submitted WITH this specific application.
     *   req.user is populated by the 'protect' middleware and includes
     *   the latest profile data from MongoDB.
     */
    const application = await Application.create({
      candidate: req.user._id,
      job: jobId,
      status: 'submitted',                          // starting status
      resumeUrl: req.user.resumeUrl || '',          // snapshot from profile
      coverLetterUrl: req.user.coverLetterUrl || '' // snapshot from profile
    });

    /*
     * Populate the referenced fields before returning to the client.
     * This swaps the IDs for readable objects.
     *
     * The 'select' option in populate is like SQL's SELECT — it limits
     * which fields are returned from the populated document.
     * Here we only want the job's title, department, and branch ID.
     */
    await application.populate('job', 'title department branch');
    await application.populate('candidate', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: application
    });
  } catch (error) {
    /*
     * Fallback for the duplicate key error — in case the findOne check
     * above had a race condition (two requests at the exact same ms).
     * MongoDB's unique index is the final safety net.
     */
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this job.'
      });
    }
    console.error('Apply error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error submitting application.',
      error: error.message
    });
  }
});

// ── GET /api/applications/my — Candidate views their applications ─
/*
 * Any logged-in user can see their own applications.
 * We filter by candidate: req.user._id to ensure each user
 * can only see their own — not other people's applications.
 *
 * NESTED POPULATE EXAMPLE:
 *   The job has a 'branch' reference inside it. To get branch
 *   data (not just its ID), we use a nested populate:
 *     populate({
 *       path: 'job',       ← populate the job field
 *       populate: {
 *         path: 'branch'   ← then populate branch inside the job
 *       }
 *     })
 *   This is a "join within a join" — three levels of data in one query.
 */
router.get('/my', protect, async (req, res) => {
  try {
    /*
     * Application.find({ candidate: req.user._id }) returns ONLY
     * the applications belonging to the current user.
     * This is the authorization check — users can't see each other's apps.
     */
    const applications = await Application.find({ candidate: req.user._id })
      .populate({
        path: 'job',                             // populate the job reference
        select: 'title department status seats branch', // which job fields to include
        populate: {
          path: 'branch',           // also populate branch INSIDE the job
          select: 'name city'       // only need branch name and city
        }
      })
      .sort({ appliedAt: -1 }); // newest applications first

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    console.error('Get my applications error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching your applications.',
      error: error.message
    });
  }
});

// ── GET /api/applications/job/:jobId — HR views applicants for a job ─
/*
 * HR-only route. Returns all applications submitted for a specific job,
 * with full candidate details so HR can review each applicant.
 *
 * :jobId in the URL is the MongoDB _id of the job.
 * req.params.jobId captures its value.
 */
router.get('/job/:jobId', protect, hrOnly, async (req, res) => {
  try {
    /*
     * Find all applications where the 'job' field matches the jobId
     * from the URL parameter. Populate candidate with extensive
     * details so HR doesn't need to make separate requests.
     *
     * Notice we DON'T populate the password — it's not listed in the
     * select string. Even though User stores the hashed password,
     * we should never send it over the network.
     */
    const applications = await Application.find({ job: req.params.jobId })
      .populate(
        'candidate',
        'name email phone address profilePicture resumeUrl coverLetterUrl createdAt'
      )
      .populate('job', 'title department branch')
      .sort({ appliedAt: -1 }); // newest first

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    console.error('Get job applications error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching applications for this job.',
      error: error.message
    });
  }
});

// ── PUT /api/applications/:id/status — HR updates status ─────
/*
 * HR-only route. Moves an application through the hiring pipeline
 * by changing its 'status' field.
 *
 * Expected body: { status: "shortlisted" }
 * (or any other valid status from the allowedStatuses list)
 *
 * Note: when status becomes 'interview_scheduled', the interview
 * is created separately via routes/interviews.js — that route
 * also calls this status update internally.
 */
router.put('/:id/status', protect, hrOnly, async (req, res) => {
  try {
    const { status } = req.body;

    /*
     * Define what values are acceptable for status.
     * This mirrors the enum in Application.js schema.
     * We validate here (not just in the schema) to provide a
     * clear error message listing the valid options.
     */
    const allowedStatuses = [
      'submitted',
      'under_review',
      'shortlisted',
      'interview_scheduled',
      'rejected',
      'selected'
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    /*
     * findByIdAndUpdate with populate — we can chain .populate()
     * after findByIdAndUpdate, and it applies to the returned document.
     * This is handy to get the full candidate info in one round-trip.
     */
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { $set: { status } }, // only change the status field
      { new: true }         // return the updated document
    )
      .populate('candidate', 'name email phone')
      .populate('job', 'title department');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Application status updated to "${status}".`,
      data: application
    });
  } catch (error) {
    console.error('Update application status error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating application status.',
      error: error.message
    });
  }
});

// ── DELETE /api/applications/:id — Candidate withdraws application ─
/*
 * Any logged-in user can delete an application, but ONLY their own.
 * We enforce this by fetching the application first and comparing
 * the candidate field to req.user._id (the logged-in user).
 *
 * This is an AUTHORIZATION check — after authentication (protect
 * confirms who you are), authorization checks what you're allowed to do.
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    // Fetch the application first to check ownership
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.'
      });
    }

    /*
     * OWNERSHIP CHECK:
     * application.candidate is a MongoDB ObjectId object.
     * req.user._id is also a MongoDB ObjectId object.
     * You CANNOT compare ObjectIds with === because they're objects,
     * not primitives. Two different ObjectId objects with the same
     * value would be === false (different references in memory).
     *
     * .toString() converts both to strings, so "64ab..." === "64ab..."
     * works correctly. This is a very common Mongoose gotcha!
     */
    if (application.candidate.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only withdraw your own applications.'
      });
    }

    // Ownership confirmed — proceed with deletion
    await Application.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully.'
    });
  } catch (error) {
    console.error('Delete application error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error withdrawing application.',
      error: error.message
    });
  }
});

// ── Export ───────────────────────────────────────────────────
// server.js mounts this with: app.use('/api/applications', applicationRoutes)
module.exports = router;
