/*
 * ============================================================
 * models/Branch.js — Branch Schema, Model & Seed Data
 * ============================================================
 * WHAT THIS FILE DOES:
 *   1. Defines the Branch schema and creates the Branch model.
 *   2. Automatically seeds 4 default branch locations when the
 *      database is empty (first time the app runs).
 *
 * WHAT IS A BRANCH?
 *   A branch represents a physical (or remote) office location
 *   of the company. When HR posts a job, they pick which branch
 *   the position is at. Candidates see "Lahore Office" instead
 *   of just an ID.
 *
 * WHAT IS SEEDING?
 *   Seeding means pre-populating a database with initial data
 *   so the app is usable right out of the box. Without seeding,
 *   HR would have to manually create branches before posting any
 *   jobs. We check if branches exist first to avoid re-inserting
 *   on every server restart.
 *
 * HOW IT FITS IN THE SYSTEM:
 *   - models/Job.js    : has a 'branch' field referencing Branch._id
 *   - routes/branches.js : CRUD routes for managing branches
 *   - routes/jobs.js   : uses .populate('branch') to embed branch data
 * ============================================================
 */

// ── Import ──────────────────────────────────────────────────
const mongoose = require('mongoose');

// ── Schema Definition ────────────────────────────────────────
/*
 * The Branch schema is simple — just three string fields.
 * All three are required so we can never have an incomplete
 * branch record in the database.
 */
const branchSchema = new mongoose.Schema(
  {
    /*
     * The display name of the branch (e.g., "Islamabad HQ").
     * unique: true means no two branches can share a name.
     * MongoDB enforces this with an index, and the route handler
     * catches the resulting error (code 11000) to return a friendly
     * "branch already exists" message.
     */
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      unique: true, // prevents duplicate branch names
      trim: true    // "  Lahore  " → "Lahore"
    },

    // The city this branch is in — shown to candidates in job listings
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },

    // Full street address for HR records and directions
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    }
  },
  {
    // Automatically add createdAt and updatedAt Date fields
    timestamps: true
  }
);

// ── Create the Model ─────────────────────────────────────────
// mongoose.model() creates the class from the schema.
// MongoDB collection name will be 'branches' (auto-pluralized).
const Branch = mongoose.model('Branch', branchSchema);

// ── Seed Default Branches ────────────────────────────────────
/*
 * We want to insert default branch data the FIRST time the app
 * runs, but NOT on subsequent restarts (it would fail because
 * 'name' is unique and the records would already exist).
 *
 * IIFE stands for "Immediately Invoked Function Expression".
 * The pattern (async () => { ... })() defines an async function
 * and calls it immediately. We use this so we can use 'await'
 * inside without needing an outer async function.
 *
 * Think of it as: "run this async block right now, once."
 */
(async () => {
  try {
    /*
     * Branch.countDocuments() queries MongoDB and returns the
     * number of documents in the 'branches' collection.
     * If the result is 0, the collection is empty → seed time.
     * If the result is > 0, branches exist → do nothing.
     *
     * We await because this is a database query (async).
     */
    const count = await Branch.countDocuments();

    if (count === 0) {
      /*
       * Branch.insertMany([...]) inserts all the documents in the
       * array at once — much faster than calling .create() in a loop.
       * It's a single round-trip to the database vs. four.
       */
      await Branch.insertMany([
        {
          name: 'Islamabad HQ',
          city: 'Islamabad',
          address: 'Blue Area, Jinnah Avenue, Islamabad, Pakistan'
        },
        {
          name: 'Lahore Office',
          city: 'Lahore',
          address: 'Gulberg III, Main Boulevard, Lahore, Pakistan'
        },
        {
          name: 'Karachi Office',
          city: 'Karachi',
          address: 'Clifton Block 5, Karachi, Pakistan'
        },
        {
          // 'Remote' is a virtual "branch" for work-from-home positions
          name: 'Remote',
          city: 'Remote',
          address: 'Work from anywhere in Pakistan'
        }
      ]);

      console.log('✅ Default branches seeded successfully (Islamabad, Lahore, Karachi, Remote)');
    }
    // If count > 0, branches already exist — skip silently
  } catch (error) {
    /*
     * The seed might fail if it runs before MongoDB finishes
     * connecting. This is a race condition at startup. It's not
     * a fatal problem — branches can be created manually via the
     * HR routes. We warn instead of crashing.
     */
    console.warn(
      '⚠️  Branch seeding skipped (MongoDB may not be connected yet or branches already exist):',
      error.message
    );
  }
})(); // ← the () at the end immediately calls the async function

// ── Export ───────────────────────────────────────────────────
module.exports = Branch;
