/*
 * ============================================================
 * models/Application.js — Job Application Schema & Model
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Defines the Application schema and exports the model.
 *   An Application is the bridge between a Candidate (User)
 *   and a Job — it's created when a candidate hits "Apply".
 *
 * WHAT IS AN APPLICATION IN THIS SYSTEM?
 *   When a candidate applies to a job, we create an Application
 *   document that:
 *     1. Links the candidate to the job
 *     2. Snapshots their resume and cover letter URLs at apply-time
 *     3. Tracks their progress through the hiring pipeline
 *
 * THE HIRING PIPELINE (status flow):
 *
 *   submitted ──► under_review ──► shortlisted ──► interview_scheduled ──► selected
 *       │               │               │                   │
 *       └───────────────┴───────────────┴───────────────────┴──► rejected
 *
 *   HR moves each application along this pipeline. When rejected,
 *   the process ends. When selected, the candidate got the job!
 *
 * KEY CONSTRAINT — ONE APPLICATION PER JOB PER CANDIDATE:
 *   We use a compound unique index on (candidate + job) to prevent
 *   a candidate from applying to the same job twice. This is
 *   enforced at the database level — even if the application code
 *   has a bug, MongoDB itself will reject the duplicate.
 *
 * HOW IT FITS IN THE SYSTEM:
 *   - routes/applications.js : create, view, update, delete applications
 *   - routes/interviews.js   : reads applications to link interviews
 *   - routes/hr.js           : counts applications for the dashboard
 * ============================================================
 */

// ── Import ──────────────────────────────────────────────────
const mongoose = require('mongoose');

// ── Schema Definition ────────────────────────────────────────
const applicationSchema = new mongoose.Schema(
  {
    // ── Relationships ─────────────────────────────────────────

    /*
     * candidate stores the _id of the User (with role 'candidate')
     * who submitted this application.
     * ref: 'User' enables .populate('candidate') to swap the ID
     * for the actual user document (name, email, phone, etc.).
     */
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate is required']
    },

    /*
     * job stores the _id of the Job this application is for.
     * ref: 'Job' enables .populate('job') to swap the ID for
     * the full job document (title, department, branch, etc.).
     */
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job is required']
    },

    // ── Pipeline Status ───────────────────────────────────────

    /*
     * status tracks where in the hiring process this application is.
     * HR managers update this as they review and process candidates.
     *
     * enum means ONLY these exact strings are valid values.
     * If HR tries to set status: 'pending' (not in the list),
     * Mongoose will throw a validation error.
     */
    status: {
      type: String,
      enum: [
        'submitted',           // candidate just applied — starting status
        'under_review',        // HR is actively looking at this application
        'shortlisted',         // HR is interested and wants to move forward
        'interview_scheduled', // an Interview document exists for this app
        'rejected',            // application is closed — candidate not selected
        'selected'             // candidate got the job!
      ],
      default: 'submitted' // every new application starts at 'submitted'
    },

    // ── File URL Snapshots ────────────────────────────────────

    /*
     * WHY SNAPSHOT THE URLS HERE?
     * We copy the candidate's current resumeUrl and coverLetterUrl
     * from their profile at the moment they apply. This is important
     * because the candidate might upload a new resume next week,
     * but HR should still see the resume that was submitted for
     * THIS specific application. Without snapshotting, HR would see
     * the candidate's latest resume instead of the one they applied with.
     */
    resumeUrl: {
      type: String,
      default: '' // empty if the candidate had no resume uploaded at apply time
    },

    // URL to cover letter at the time of application
    coverLetterUrl: {
      type: String,
      default: ''
    },

    // ── Timestamp ─────────────────────────────────────────────

    /*
     * appliedAt is when the application was submitted.
     * We define it explicitly (instead of just using timestamps.createdAt)
     * because the frontend expects the field name 'appliedAt'.
     *
     * Date.now is passed as a FUNCTION REFERENCE, not a call.
     * Writing Date.now() (with parentheses) would set it once at
     * module load time — the same date for every document!
     * Writing Date.now (no parentheses) means "call this function
     * each time a new document is created" — correct behavior.
     */
    appliedAt: {
      type: Date,
      default: Date.now // Mongoose calls Date.now() for each new document
    }
  },
  {
    // Still include timestamps for updatedAt (when status last changed)
    timestamps: true
  }
);

// ── Compound Unique Index ─────────────────────────────────────
/*
 * applicationSchema.index({ candidate: 1, job: 1 }, { unique: true })
 * creates a "compound index" — an index on the COMBINATION of two fields.
 *
 * This means the PAIR (candidate, job) must be unique across all documents.
 * In English: "one candidate can only apply to any given job once."
 *
 * A candidate CAN apply to many different jobs (candidate is not unique alone).
 * A job CAN receive many applications (job is not unique alone).
 * But the SAME candidate cannot apply to the SAME job more than once.
 *
 * The 1 after each field name means "ascending sort order in the index"
 * (required by MongoDB — use 1 or -1, similar to sort direction).
 *
 * { unique: true } is what actually enforces the uniqueness constraint.
 * If a duplicate is inserted, MongoDB throws error code 11000 (duplicate key),
 * which our route handler catches and converts to a friendly error message.
 */
applicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

// ── Create & Export the Model ────────────────────────────────
// MongoDB collection will be named 'applications' (auto-pluralized)
const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
