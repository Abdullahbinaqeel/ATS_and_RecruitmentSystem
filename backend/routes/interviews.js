/*
 * ============================================================
 * routes/interviews.js — Interview Scheduling Routes
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Handles scheduling, viewing, updating, and cancelling
 *   interviews between HR and shortlisted candidates.
 *
 * ROUTES:
 *   POST   /api/interviews                        — HR schedules an interview
 *   GET    /api/interviews/my                     — candidate sees their upcoming interviews
 *   GET    /api/interviews/application/:appId     — HR sees interview for a specific application
 *   PUT    /api/interviews/:id                    — HR updates interview date/time/message
 *   DELETE /api/interviews/:id                    — HR cancels an interview
 *
 * IMPORTANT SIDE EFFECTS:
 *   Creating an interview  → also sets Application.status = 'interview_scheduled'
 *   Cancelling an interview → also reverts Application.status = 'shortlisted'
 *   This keeps both collections in sync so the status always reflects reality.
 *
 * NESTED POPULATE:
 *   The Interview → Application → Candidate/Job chain requires
 *   nested populate to get human-readable data. Example:
 *     .populate({
 *       path: 'application',        ← populate the application reference
 *       populate: [
 *         { path: 'candidate', ... }, ← then populate candidate inside application
 *         { path: 'job', ... }        ← and also populate job inside application
 *       ]
 *     })
 *
 * THE $in OPERATOR:
 *   When a candidate wants their interviews, we can't directly
 *   query Interview by candidate ID (Interview doesn't have that field).
 *   Instead we: (1) get all the candidate's application IDs,
 *   (2) find interviews where 'application' is in that list.
 *   $in is like SQL's "WHERE application IN (id1, id2, id3, ...)"
 *
 * HOW IT FITS IN THE SYSTEM:
 *   - models/Interview.js    : defines the Interview schema
 *   - models/Application.js  : Interview updates Application.status
 *   - routes/hr.js           : looks up interviews to include in emails
 * ============================================================
 */

// ── Imports ──────────────────────────────────────────────────
const express = require('express');
const router = express.Router();

// Models we'll query and update
const Interview = require('../models/Interview');
const Application = require('../models/Application');

// protect = must be logged in, hrOnly = must have role 'hr'
const { protect, hrOnly } = require('../middleware/auth');

// ── POST /api/interviews — HR schedules an interview ──────────
/*
 * HR-only route. Creates a new Interview document AND updates
 * the linked Application's status to 'interview_scheduled'.
 *
 * Expected request body: { applicationId, date, time, message? }
 * date example: "2024-08-15" (ISO date string)
 * time example: "10:30 AM"   (plain string)
 */
router.post('/', protect, hrOnly, async (req, res) => {
  try {
    const { applicationId, date, time, message } = req.body;

    // All three core fields are required
    if (!applicationId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide applicationId, date, and time.'
      });
    }

    // Verify the application actually exists before creating the interview
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.'
      });
    }

    /*
     * Create the Interview document.
     * new Date(date) converts the date string "2024-08-15" into
     * a JavaScript Date object — MongoDB stores Dates properly
     * indexed, which allows sorting and date range queries.
     * If we stored "2024-08-15" as a raw string, sorting wouldn't work.
     */
    const interview = await Interview.create({
      application: applicationId,
      scheduledDate: new Date(date), // string → Date object for proper MongoDB storage
      scheduledTime: time,
      message: message || '',        // empty string if no message provided
      createdBy: req.user._id        // the HR user creating this interview
    });

    /*
     * IMPORTANT SIDE EFFECT:
     * Update the application's status to reflect that an interview exists.
     * We do this in the same request for consistency — the Interview and
     * Application are now always in sync.
     *
     * findByIdAndUpdate returns the updated doc but we don't need it here.
     * We don't await an assignment — just await the promise to ensure
     * it completes before we respond.
     */
    await Application.findByIdAndUpdate(applicationId, {
      $set: { status: 'interview_scheduled' }
    });

    /*
     * Nested populate: Interview → Application → Candidate/Job
     * This builds a rich response with all the details the
     * frontend needs to display a confirmation screen.
     */
    await interview.populate({
      path: 'application',
      populate: [
        { path: 'candidate', select: 'name email phone' },
        { path: 'job', select: 'title department' }
      ]
    });
    await interview.populate('createdBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully! Application status updated.',
      data: interview
    });
  } catch (error) {
    console.error('Schedule interview error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error scheduling interview.',
      error: error.message
    });
  }
});

// ── GET /api/interviews/my — Candidate sees their interviews ──
/*
 * Any logged-in user (typically a candidate) sees their scheduled
 * interviews. The challenge: Interview documents don't directly
 * store the candidate ID — they store an applicationId. So we
 * do a two-step query.
 *
 * Step 1: Find all application IDs that belong to this candidate.
 * Step 2: Find interviews where 'application' is in those IDs.
 *
 * This is because MongoDB doesn't support SQL-style JOINs natively.
 * We manually "join" by querying across two collections.
 */
router.get('/my', protect, async (req, res) => {
  try {
    /*
     * Step 1: Get all application IDs for this candidate.
     * The second argument '_id' is a projection — it tells Mongoose
     * to return ONLY the _id field (not the full document).
     * This saves memory since we only need the IDs.
     */
    const myApplications = await Application.find(
      { candidate: req.user._id }, // filter: only this user's applications
      '_id'                        // projection: only return the _id field
    );

    /*
     * .map((app) => app._id) transforms the array of application documents
     * into an array of just their _id values:
     *   [{ _id: "64ab..." }, { _id: "64cd..." }]
     *   becomes: ["64ab...", "64cd..."]
     * We need this array for the $in operator in the next query.
     */
    const appIds = myApplications.map((app) => app._id);

    /*
     * Step 2: Find interviews linked to any of those application IDs.
     *
     * The $in operator is a MongoDB query operator that means:
     * "match documents where this field's value is IN this array".
     * { application: { $in: appIds } } finds interviews where the
     * application field matches any ID in our appIds array.
     *
     * This is equivalent to SQL:
     *   SELECT * FROM interviews WHERE application_id IN (id1, id2, ...)
     */
    const interviews = await Interview.find({ application: { $in: appIds } })
      .populate({
        path: 'application',
        select: 'status job candidate',
        populate: [
          { path: 'job', select: 'title department branch' },
          { path: 'candidate', select: 'name email' }
        ]
      })
      .populate('createdBy', 'name email')
      .sort({ scheduledDate: 1 }); // ascending date: soonest interview first

    return res.status(200).json({
      success: true,
      count: interviews.length,
      data: interviews
    });
  } catch (error) {
    console.error('Get my interviews error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching your interviews.',
      error: error.message
    });
  }
});

// ── GET /api/interviews/application/:applicationId ────────────
/*
 * HR-only route. Returns all interviews for a specific application.
 * (There might be more than one if the interview was rescheduled —
 * each reschedule creates a new Interview document.)
 *
 * :applicationId in the URL is the Application's MongoDB _id.
 */
router.get('/application/:applicationId', protect, hrOnly, async (req, res) => {
  try {
    const interviews = await Interview.find({
      application: req.params.applicationId
    })
      .populate({
        path: 'application',
        populate: [
          { path: 'candidate', select: 'name email phone' },
          { path: 'job', select: 'title department' }
        ]
      })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 }); // most recently created interview first

    return res.status(200).json({
      success: true,
      count: interviews.length,
      data: interviews
    });
  } catch (error) {
    console.error('Get application interviews error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching interviews for this application.',
      error: error.message
    });
  }
});

// ── PUT /api/interviews/:id — HR updates interview details ────
/*
 * HR-only route. Allows HR to reschedule or add/change the message.
 * Only the fields provided in the request body are updated.
 * Expected body: any combination of { date, time, message }
 */
router.put('/:id', protect, hrOnly, async (req, res) => {
  try {
    const { date, time, message } = req.body;

    // Build partial update object from only the provided fields
    const updates = {};
    if (date !== undefined) updates.scheduledDate = new Date(date); // string → Date
    if (time !== undefined) updates.scheduledTime = time;
    if (message !== undefined) updates.message = message;

    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate({
        path: 'application',
        populate: [
          { path: 'candidate', select: 'name email phone' },
          { path: 'job', select: 'title department' }
        ]
      })
      .populate('createdBy', 'name email');

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Interview updated successfully.',
      data: interview
    });
  } catch (error) {
    console.error('Update interview error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating interview.',
      error: error.message
    });
  }
});

// ── DELETE /api/interviews/:id — HR cancels an interview ──────
/*
 * HR-only route. Deletes the Interview document AND reverts the
 * linked Application's status back to 'shortlisted'.
 *
 * WHY REVERT THE STATUS?
 *   The 'interview_scheduled' status only makes sense when an
 *   Interview document exists. If we cancel the interview without
 *   reverting, the application status would say 'interview_scheduled'
 *   with no interview — contradictory and confusing. Reverting to
 *   'shortlisted' accurately reflects where the candidate stands.
 */
router.delete('/:id', protect, hrOnly, async (req, res) => {
  try {
    // Find the interview first so we can access its application field
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found.'
      });
    }

    /*
     * Revert the application status one step back in the pipeline.
     * interview.application holds the Application's _id.
     * We use it to find and update the correct Application document.
     */
    await Application.findByIdAndUpdate(interview.application, {
      $set: { status: 'shortlisted' } // one step back in the pipeline
    });

    // Now delete the interview document itself
    await Interview.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Interview cancelled. Application status reverted to shortlisted.'
    });
  } catch (error) {
    console.error('Delete interview error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling interview.',
      error: error.message
    });
  }
});

// ── Export ───────────────────────────────────────────────────
// server.js mounts this with: app.use('/api/interviews', interviewRoutes)
module.exports = router;
