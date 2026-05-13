/*
 * ============================================================
 * routes/hr.js — HR Dashboard & Email Routes
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Provides two powerful HR-only features:
 *
 *   1. GET  /api/hr/dashboard          — aggregated statistics overview
 *   2. POST /api/hr/email/:applicationId — send a templated email to a candidate
 *
 * DASHBOARD:
 *   Aggregates data from multiple collections into one response:
 *     - total jobs, applications, candidates
 *     - how many applications are at each status stage
 *     - the 5 most recent applications
 *   Useful for HR managers to see the "big picture" at a glance.
 *
 * EMAIL:
 *   HR can send one of four email templates to a candidate:
 *     'shortlist'  — "You've been shortlisted!"
 *     'interview'  — "Your interview is scheduled for..."
 *     'rejection'  — "Unfortunately, we won't be moving forward..."
 *     'custom'     — free-form message written by HR
 *
 * PERFORMANCE TECHNIQUE — Promise.all():
 *   The dashboard needs several independent DB queries. Running
 *   them one after another (sequentially) wastes time — each
 *   query waits for the previous one to finish.
 *   Promise.all([q1, q2, q3]) runs ALL queries at the same time
 *   (in parallel) and waits for ALL to finish. Much faster!
 *
 * MONGODB AGGREGATION:
 *   The $group aggregation pipeline stage groups documents by
 *   a field and can compute values for each group (like COUNT).
 *   We use it to count applications per status stage.
 *
 * HOW IT FITS IN THE SYSTEM:
 *   - models/Application.js : provides the application data
 *   - models/Interview.js   : interview details for email content
 *   - models/Job.js         : job counts for dashboard
 *   - models/User.js        : candidate counts for dashboard
 *   - utils/email.js        : actual email sending and templates
 * ============================================================
 */

// ── Imports ──────────────────────────────────────────────────
const express = require('express');
const router = express.Router();

// All four models needed for dashboard queries and email data
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Job = require('../models/Job');
const User = require('../models/User');

// Middleware: both protect AND hrOnly required for all routes here
const { protect, hrOnly } = require('../middleware/auth');

/*
 * Import the email utility functions.
 * sendEmail     — actually sends the email via Nodemailer/Gmail
 * shortlistEmail — generates the shortlist email template
 * interviewEmail — generates the interview invitation template
 * rejectionEmail — generates the rejection email template
 * customEmail    — generates a custom message email
 *
 * Each template function returns { subject, html } — the subject
 * line and HTML body of the email.
 */
const {
  sendEmail,
  shortlistEmail,
  interviewEmail,
  rejectionEmail,
  customEmail
} = require('../utils/email');

// ── GET /api/hr/dashboard — HR dashboard statistics ──────────
/*
 * HR-only route. Returns a comprehensive stats object.
 *
 * We run 5 queries simultaneously using Promise.all() for speed.
 * Without Promise.all(), if each query took 100ms, we'd wait
 * 500ms total (sequential). With Promise.all(), all 5 run at
 * once and we wait ~100ms total (the slowest one).
 *
 * Destructuring assignment on the result array:
 *   const [a, b, c, d, e] = await Promise.all([q1, q2, q3, q4, q5])
 * This assigns each query result to a named variable in order.
 */
router.get('/dashboard', protect, hrOnly, async (req, res) => {
  try {
    /*
     * Promise.all() takes an array of Promises and returns a
     * single Promise that resolves with an array of all results
     * (in the same order). We await that single Promise.
     */
    const [
      totalJobs,
      totalApplications,
      totalCandidates,
      statusCounts,
      recentApplications
    ] = await Promise.all([

      // Query 1: Total number of job postings
      Job.countDocuments(), // countDocuments() counts matching docs (all, since no filter)

      // Query 2: Total number of applications submitted ever
      Application.countDocuments(),

      // Query 3: Total number of candidate users
      // { role: 'candidate' } filters to only users with that role
      User.countDocuments({ role: 'candidate' }),

      /*
       * Query 4: MongoDB Aggregation Pipeline
       *
       * Aggregation pipelines transform documents through a series
       * of "stages" (like assembly line steps). Each stage takes
       * the output of the previous stage as input.
       *
       * We use ONE stage here: $group
       * $group groups all matching documents by a field value and
       * can compute summary values (sum, average, max, etc.) per group.
       *
       * { _id: '$status' }    — group by the 'status' field
       *                         (the $ prefix means "use the value of this field")
       * { count: { $sum: 1 }} — for each document in the group, add 1 to count
       *
       * Result looks like:
       *   [
       *     { _id: 'submitted', count: 12 },
       *     { _id: 'shortlisted', count: 5 },
       *     { _id: 'rejected', count: 8 },
       *     ...
       *   ]
       */
      Application.aggregate([
        {
          $group: {
            _id: '$status',    // group documents by their 'status' field
            count: { $sum: 1 } // count the documents in each group
          }
        }
      ]),

      /*
       * Query 5: The 5 most recently submitted applications with full details.
       * .limit(5) stops after returning 5 documents — no matter how many exist.
       * .sort({ appliedAt: -1 }) puts newest first.
       * We populate both candidate and job (with nested branch) for full details.
       */
      Application.find()
        .sort({ appliedAt: -1 }) // newest first
        .limit(5)               // only the 5 most recent
        .populate('candidate', 'name email profilePicture')
        .populate({
          path: 'job',
          select: 'title department branch',
          populate: { path: 'branch', select: 'name city' }
        })
    ]);

    /*
     * Transform the aggregation array into a friendly object.
     *
     * The aggregation returns an array like:
     *   [{ _id: 'shortlisted', count: 5 }, { _id: 'rejected', count: 8 }]
     * But the frontend wants a simple object like:
     *   { submitted: 0, under_review: 0, shortlisted: 5, ..., rejected: 8 }
     *
     * We pre-fill the object with 0 for all statuses. This ensures
     * the frontend always has every key, even if no applications are
     * in that status yet (avoids "undefined" errors in the frontend).
     */
    const applicationsByStatus = {
      submitted: 0,
      under_review: 0,
      shortlisted: 0,
      interview_scheduled: 0,
      rejected: 0,
      selected: 0
    };

    /*
     * Loop through the aggregation results and fill in the real counts.
     * .forEach() iterates over each item in the array.
     * item._id is the status string, item.count is the count number.
     *
     * .hasOwnProperty() ensures we only update keys that belong to
     * our object (not inherited prototype properties) — defensive programming.
     */
    statusCounts.forEach((item) => {
      if (applicationsByStatus.hasOwnProperty(item._id)) {
        applicationsByStatus[item._id] = item.count;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalJobs,
        totalApplications,
        totalCandidates,
        applicationsByStatus, // the transformed status counts object
        recentApplications    // the 5 most recent application documents
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data.',
      error: error.message
    });
  }
});

// ── POST /api/hr/email/:applicationId — Send email to candidate ─
/*
 * HR-only route. Sends a templated email to the candidate who
 * submitted a specific application.
 *
 * :applicationId in the URL identifies which application (and thus
 * which candidate) to email. req.params.applicationId captures it.
 *
 * Expected body: { type: 'shortlist'|'interview'|'rejection'|'custom', message? }
 *   type = which email template to use
 *   message = required only for type 'custom' (the custom message text)
 */
router.post('/email/:applicationId', protect, hrOnly, async (req, res) => {
  try {
    const { type, message } = req.body;

    // Validate the email type is one we support
    const validTypes = ['shortlist', 'interview', 'rejection', 'custom'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid email type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    /*
     * Find the application and populate candidate + job info.
     * We need the candidate's name and email to address and send the email.
     * We need the job title to include it in the email content.
     */
    const application = await Application.findById(req.params.applicationId)
      .populate('candidate', 'name email')
      .populate('job', 'title department');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.'
      });
    }

    // Extract the data we need for the email templates
    const candidateName = application.candidate.name;
    const candidateEmail = application.candidate.email;
    const jobTitle = application.job.title;

    /*
     * Generate the appropriate email content based on the requested type.
     * Each template function returns { subject, html }.
     * We declare emailContent and assign it in the right if-branch.
     */
    let emailContent;

    if (type === 'shortlist') {
      // Simple congratulations email — just name and job title
      emailContent = shortlistEmail(candidateName, jobTitle);

    } else if (type === 'interview') {
      /*
       * For interview emails, look up the actual Interview document
       * to get the scheduled date and time to include in the email.
       *
       * Interview.findOne() with .sort({ createdAt: -1 }) gets the
       * MOST RECENT interview if there are multiple (rescheduled cases).
       *
       * If no interview exists yet, we fall back to "To be confirmed"
       * placeholder text.
       */
      const interview = await Interview.findOne({
        application: application._id
      }).sort({ createdAt: -1 }); // get most recent interview if multiple exist

      const date = interview ? interview.scheduledDate : 'To be confirmed';
      const time = interview ? interview.scheduledTime : 'To be confirmed';
      const interviewMessage = interview ? interview.message : (message || '');

      emailContent = interviewEmail(candidateName, jobTitle, date, time, interviewMessage);

    } else if (type === 'rejection') {
      // Polite rejection email — just name and job title
      emailContent = rejectionEmail(candidateName, jobTitle);

    } else if (type === 'custom') {
      // For custom emails, the 'message' field in the request body is the content
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'A "message" field is required for custom emails.'
        });
      }
      emailContent = customEmail(candidateName, message);
    }

    /*
     * Actually send the email using the Nodemailer transporter
     * configured in utils/email.js.
     * sendEmail(to, subject, htmlBody) is async because sending
     * an email over SMTP takes time (network call to Gmail servers).
     */
    await sendEmail(candidateEmail, emailContent.subject, emailContent.html);

    return res.status(200).json({
      success: true,
      message: `${type} email sent successfully to ${candidateEmail}.`
    });
  } catch (error) {
    console.error('Send email error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error sending email.',
      error: error.message
    });
  }
});

// ── Export ───────────────────────────────────────────────────
// server.js mounts this with: app.use('/api/hr', hrRoutes)
module.exports = router;
