/*
 * ============================================================
 * models/Job.js — Job Posting Schema & Model
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Defines the shape of a "Job" document in MongoDB and
 *   exports the Job model so routes can create, query, and
 *   manage job postings.
 *
 * WHAT IS A JOB IN THIS SYSTEM?
 *   A Job is a job posting created by an HR manager. It describes
 *   an open position at a specific branch. Candidates browse jobs
 *   and submit applications for the ones they want.
 *
 * KEY CONCEPT — REFERENCES (RELATIONSHIPS BETWEEN COLLECTIONS):
 *   Unlike a relational database (SQL) that uses foreign keys,
 *   MongoDB stores references as ObjectId values. To link a Job
 *   to a Branch, we store the Branch's _id inside the Job document.
 *
 *   When we query jobs, we use Mongoose's .populate('branch') to
 *   automatically replace the stored ID with the full Branch document.
 *   Without populate, you'd get: branch: "64ab1c2d..."
 *   With populate, you get:      branch: { name: "Lahore", city: "Lahore", ... }
 *
 * FULL-TEXT SEARCH:
 *   We add a MongoDB text index on title and department so
 *   candidates can search for jobs using keywords.
 *
 * HOW IT FITS IN THE SYSTEM:
 *   - routes/jobs.js         : CRUD routes for HR + browsing for candidates
 *   - models/Application.js  : has a 'job' field referencing Job._id
 *   - routes/applications.js : checks if a job is still open before applying
 * ============================================================
 */

// ── Import ──────────────────────────────────────────────────
const mongoose = require('mongoose');

// ── Schema Definition ────────────────────────────────────────
const jobSchema = new mongoose.Schema(
  {
    // ── Job Details ─────────────────────────────────────────

    // The position title shown to candidates (e.g., "Senior React Developer")
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true
    },

    // Which department is hiring (e.g., "Engineering", "Finance", "HR")
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },

    // Detailed description of the role, responsibilities, and company
    description: {
      type: String,
      required: [true, 'Job description is required']
    },

    /*
     * List of qualifications/requirements as an array of strings.
     * MongoDB natively supports arrays — no separate "requirements"
     * table needed like in SQL.
     * Example: ["3+ years React", "BSc Computer Science", "Team player"]
     */
    requirements: {
      type: [String], // [] tells Mongoose this field is an array of strings
      default: []     // default to empty array if HR doesn't add requirements
    },

    // ── References to Other Collections ─────────────────────

    /*
     * branch stores the MongoDB _id of the Branch where this job is.
     * mongoose.Schema.Types.ObjectId is the data type for MongoDB IDs.
     * ref: 'Branch' is metadata that tells Mongoose: "when you populate
     * this field, look in the 'Branch' model/collection."
     *
     * This is how MongoDB "joins" data — it's manual and explicit,
     * unlike SQL's automatic foreign key joins.
     */
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',   // which model to use when populating
      required: [true, 'Branch is required']
    },

    // ── Availability ─────────────────────────────────────────

    // How many candidates will be hired for this position
    seats: {
      type: Number,
      required: [true, 'Number of seats is required'],
      min: [1, 'There must be at least 1 seat'] // minimum value validation
    },

    /*
     * The current state of the job listing:
     *   'open'   — accepting new applications
     *   'closed' — no longer accepting applications (position filled
     *              or HR chose to close it)
     *
     * We only show 'open' jobs by default in the GET /api/jobs route
     * so candidates don't waste time applying to closed positions.
     */
    status: {
      type: String,
      enum: ['open', 'closed'], // only these values are allowed
      default: 'open'           // new jobs are open by default
    },

    // ── Audit Trail ──────────────────────────────────────────

    /*
     * Which HR user created this job posting.
     * ref: 'User' lets us populate this with the HR user's name/email.
     * Useful for HR teams to know who posted what.
     */
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Posted by (HR user) is required']
    }
  },
  {
    // Automatically manage createdAt and updatedAt timestamps
    timestamps: true
  }
);

// ── Text Index for Search ────────────────────────────────────
/*
 * jobSchema.index({ title: 'text', department: 'text' }) creates
 * a MongoDB "text index" on those two fields.
 *
 * A text index enables full-text search using the $text query
 * operator. Without it, searching for "developer" would require
 * a slow collection scan through every document.
 *
 * With it, the query:
 *   Job.find({ $text: { $search: 'developer' } })
 * is fast because MongoDB has pre-indexed all the words.
 *
 * 'text' (the value) means "build a text index on this field".
 * The number 1 (used in other index types) means ascending index.
 * You can only have ONE text index per collection — that's why
 * we combine both fields into a single index definition.
 */
jobSchema.index({ title: 'text', department: 'text' });

// ── Create & Export the Model ────────────────────────────────
// The collection in MongoDB will be named 'jobs' (auto-pluralized)
const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
