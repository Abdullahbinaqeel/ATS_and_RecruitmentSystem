/*
 * ============================================================
 * models/Interview.js — Interview Schedule Schema & Model
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Defines the Interview schema and exports the model.
 *   An Interview document is created when HR schedules a meeting
 *   with a shortlisted candidate.
 *
 * WHERE DOES AN INTERVIEW FIT?
 *   The hiring pipeline goes:
 *     submitted → under_review → shortlisted → interview_scheduled → selected/rejected
 *
 *   When HR creates an Interview:
 *     1. An Interview document is saved (this model)
 *     2. The related Application's status is ALSO updated to
 *        'interview_scheduled' (done in routes/interviews.js)
 *   Both changes happen together in one API request.
 *
 * WHY A SEPARATE MODEL?
 *   We could have stored date/time inside the Application, but
 *   a separate Interview model lets us:
 *     - Store additional info (message to candidate, who scheduled it)
 *     - Support rescheduling (update Interview without changing Application)
 *     - Cancel the interview and revert Application status cleanly
 *
 * RELATIONSHIPS:
 *   - application → links to the Application being interviewed
 *   - createdBy   → the HR User who scheduled this interview
 *   From the application, we can reach the candidate and the job
 *   via nested .populate() calls.
 *
 * HOW IT FITS IN THE SYSTEM:
 *   - routes/interviews.js : CRUD for interview scheduling
 *   - routes/hr.js         : looks up interview to include details in email
 * ============================================================
 */

// ── Import ──────────────────────────────────────────────────
const mongoose = require('mongoose');

// ── Schema Definition ────────────────────────────────────────
const interviewSchema = new mongoose.Schema(
  {
    // ── Link to the Application ──────────────────────────────

    /*
     * application stores the _id of the Application this interview
     * is for. Through this reference we can reach the candidate
     * and the job via nested populate calls.
     *
     * Example nested populate (used in routes):
     *   .populate({
     *     path: 'application',
     *     populate: [
     *       { path: 'candidate', select: 'name email' },
     *       { path: 'job', select: 'title department' }
     *     ]
     *   })
     */
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application', // populate from the Application model
      required: [true, 'Application reference is required']
    },

    // ── Schedule Info ─────────────────────────────────────────

    /*
     * scheduledDate is the calendar date of the interview.
     * Stored as a JavaScript Date object in MongoDB.
     * When HR sends "2024-08-15" (a string), we convert it with
     * new Date(date) in the route before saving here.
     */
    scheduledDate: {
      type: Date,
      required: [true, 'Interview date is required']
    },

    /*
     * scheduledTime is the time of day as a plain string.
     * Examples: "10:30 AM", "14:00", "3:00 PM"
     *
     * WHY NOT USE A DATE OBJECT FOR TIME TOO?
     *   JavaScript Date objects always include both a date AND time.
     *   Storing time-only data in a Date would require a fake date
     *   (like 1970-01-01 10:30:00) which is confusing.
     *   A string like "10:30 AM" is simpler and clearer.
     */
    scheduledTime: {
      type: String,
      required: [true, 'Interview time is required'],
      trim: true // remove accidental leading/trailing spaces
    },

    /*
     * message is an optional note from HR to the candidate.
     * HR might write: "Please bring 3 copies of your portfolio"
     * or "The interview will be conducted via Zoom."
     * This message is included in the interview notification email.
     */
    message: {
      type: String,
      default: '' // empty string means no special message
    },

    // ── Audit Trail ───────────────────────────────────────────

    /*
     * createdBy records which HR user scheduled this interview.
     * Useful if multiple HR managers share access — you can see
     * who scheduled what. ref: 'User' allows populating with
     * the HR user's name and email.
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by (HR user) is required']
    }
  },
  {
    /*
     * timestamps: true adds:
     *   createdAt — when the interview was first scheduled
     *   updatedAt — when the interview details were last changed
     * These help track rescheduling history.
     */
    timestamps: true
  }
);

// ── Create & Export the Model ────────────────────────────────
// MongoDB collection name will be 'interviews' (auto-pluralized)
const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;
