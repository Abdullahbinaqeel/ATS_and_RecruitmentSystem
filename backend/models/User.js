/*
 * ============================================================
 * models/User.js — User Schema & Model
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Defines what a "User" document looks like in MongoDB and
 *   exports a Model class that lets other files create, find,
 *   update, and delete users.
 *
 * MONGOOSE CONCEPTS USED HERE:
 *   Schema — a blueprint describing the shape of documents in a
 *            MongoDB collection (like a table schema in SQL).
 *            It defines field names, types, validation rules,
 *            and default values.
 *
 *   Model  — a JavaScript class generated from a Schema.
 *            You call Model.create(), Model.find(), etc. to
 *            interact with MongoDB. Mongoose handles the actual
 *            MongoDB queries behind the scenes.
 *
 * WHO IS A USER?
 *   This single model covers BOTH user types in our system:
 *     - 'candidate' : a job seeker who browses and applies to jobs
 *     - 'hr'        : an HR manager who posts jobs and reviews apps
 *   The 'role' field tells them apart.
 *
 * PASSWORD SECURITY:
 *   We NEVER store passwords as plain text. If our database were
 *   ever stolen, plain-text passwords would be a disaster because
 *   people reuse passwords. Instead, we use bcrypt to hash them:
 *
 *   Hashing = running a password through a one-way mathematical
 *   function. "One-way" means you can't reverse it to get the
 *   original. To verify a login, we hash the entered password
 *   again and compare the two hashes.
 *
 * HOW IT FITS IN THE SYSTEM:
 *   - routes/auth.js  : creates users, verifies passwords
 *   - middleware/auth.js : looks up users by ID from JWT
 *   - routes/hr.js    : counts candidates for dashboard
 * ============================================================
 */

// ── Imports ──────────────────────────────────────────────────
// mongoose gives us Schema, Model, and all Mongoose utilities
const mongoose = require('mongoose');

// bcryptjs is a pure-JavaScript implementation of the bcrypt
// hashing algorithm. We use it to hash passwords before saving
// and to compare passwords during login.
const bcrypt = require('bcryptjs');

// ── Schema Definition ────────────────────────────────────────
/*
 * new mongoose.Schema({ ... }, { options }) creates the blueprint.
 *
 * Each field is defined as:
 *   fieldName: {
 *     type:     the data type (String, Number, Date, Boolean, etc.)
 *     required: [true, 'error message'] — field must be present
 *     unique:   true — MongoDB enforces no duplicates in this field
 *     default:  value to use if this field is not provided
 *     trim:     true — removes leading/trailing whitespace automatically
 *     enum:     [...] — value must be one of the listed options
 *   }
 */
const userSchema = new mongoose.Schema(
  {
    // ── Basic Info ──────────────────────────────────────────
    // Full display name of the user
    name: {
      type: String,
      required: [true, 'Name is required'], // the string is the validation error message
      trim: true  // "  John Doe  " becomes "John Doe" automatically
    },

    /*
     * Email is the unique login identifier.
     * unique: true tells MongoDB to create an index that prevents
     * two documents from having the same email value.
     * lowercase: true stores "User@Example.COM" as "user@example.com"
     * so lookups always work regardless of case.
     */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,    // no two users can have the same email
      lowercase: true, // always normalize to lowercase before saving
      trim: true
    },

    /*
     * The password is stored HASHED, not plain text.
     * We never store "password123" — we store something like:
     *   "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
     * The pre-save hook below handles the hashing automatically.
     */
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },

    // ── Role ────────────────────────────────────────────────
    /*
     * role determines what the user is allowed to do:
     *   'candidate' — can apply to jobs, view their own applications
     *   'hr'        — can manage jobs, view all applications, email candidates
     *
     * enum restricts the value to only those two strings.
     * If someone tries to set role: 'admin', Mongoose rejects it.
     * default: 'candidate' means new registrations are candidates
     * unless explicitly set to 'hr'.
     */
    role: {
      type: String,
      enum: ['candidate', 'hr'], // only these two values are valid
      default: 'candidate'       // all new accounts start as candidates
    },

    // ── Optional Profile Fields ──────────────────────────────
    // Contact phone number (optional — candidate may add later)
    phone: {
      type: String,
      default: '' // empty string instead of null so the field always exists
    },

    // Residential or work address
    address: {
      type: String,
      default: ''
    },

    /*
     * URL to the user's profile picture, hosted on Cloudinary.
     * Empty string means no picture uploaded yet — the frontend
     * can show a placeholder avatar in that case.
     */
    profilePicture: {
      type: String,
      default: ''
    },

    /*
     * Cloudinary URL for the candidate's resume PDF.
     * When a candidate applies to a job, we copy this URL into
     * the Application document as a snapshot of the resume they
     * submitted at that time.
     */
    resumeUrl: {
      type: String,
      default: ''
    },

    // Cloudinary URL for the candidate's cover letter (PDF or DOCX)
    coverLetterUrl: {
      type: String,
      default: ''
    }
  },
  {
    /*
     * timestamps: true tells Mongoose to automatically manage two
     * extra fields on every document:
     *   createdAt — set once when the document is first saved
     *   updatedAt — updated automatically every time the document changes
     * We never set these manually; Mongoose handles them.
     */
    timestamps: true
  }
);

// ── Pre-Save Hook: Hash Password ─────────────────────────────
/*
 * A Mongoose "hook" (or "middleware") is a function that runs
 * automatically at a specific point in a document's lifecycle.
 * 'pre' means "run this BEFORE the operation".
 * 'save' means "trigger when .save() or .create() is called".
 *
 * So this function runs every time a User document is about to
 * be saved to MongoDB — giving us a chance to hash the password.
 *
 * WHY a regular function (not arrow function)?
 *   Arrow functions don't have their own 'this'. Inside a
 *   Mongoose pre-save hook, 'this' refers to the document being
 *   saved. We need 'this' to read and modify this.password.
 */
userSchema.pre('save', async function (next) {
  /*
   * this.isModified('password') returns true if the password
   * field changed since the document was last saved (or if the
   * document is brand new).
   *
   * WHY CHECK THIS? If we update a user's name or phone, we
   * don't want to re-hash their already-hashed password.
   * Re-hashing a hash would make it impossible to log in!
   * So we skip hashing when the password hasn't changed.
   */
  if (!this.isModified('password')) {
    return next(); // skip to next step, nothing to do
  }

  /*
   * bcrypt.genSalt(10) generates a random "salt" — extra random
   * data that's mixed into the password before hashing.
   *
   * WHY USE A SALT?
   *   Without a salt, two users with the same password would have
   *   the same hash, making it easy to crack many accounts at once.
   *   The salt makes every hash unique, even for identical passwords.
   *
   * The number 10 is the "cost factor" (also called "rounds").
   *   Higher = slower to compute = harder to brute-force.
   *   Lower  = faster to compute = easier to crack.
   *   10 is the industry-standard balance for web apps.
   */
  const salt = await bcrypt.genSalt(10);

  /*
   * bcrypt.hash(plainText, salt) combines the plain-text password
   * with the salt and runs the bcrypt algorithm, producing a
   * fixed-length hash string. We replace this.password with the
   * hash so the plain-text password is never stored anywhere.
   */
  this.password = await bcrypt.hash(this.password, salt);

  // Call next() to continue saving the document
  next();
});

// ── Instance Method: comparePassword ─────────────────────────
/*
 * Instance methods are functions added to every document of this
 * model. They can be called on an individual user object:
 *   const user = await User.findOne({ email });
 *   const isMatch = await user.comparePassword('entered_password');
 *
 * This method is used in the login route to check if the
 * password the user typed matches the hash stored in the DB.
 *
 * bcrypt.compare() hashes the entered password with the SAME
 * salt that was used originally (stored inside the hash string)
 * and compares the results. Returns true if they match.
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  // bcrypt.compare(plain, hash) — returns true or false
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Create & Export the Model ────────────────────────────────
/*
 * mongoose.model('User', userSchema) creates a Model class.
 * The first argument 'User' is the model name. Mongoose will
 * use the 'users' collection in MongoDB (it pluralizes and
 * lowercases the model name automatically).
 *
 * Now anywhere we import User, we can do:
 *   User.create({ ... })        — save a new user document
 *   User.findById(id)           — find user by MongoDB _id
 *   User.findOne({ email })     — find user by email
 *   User.findByIdAndUpdate(...) — find and update in one step
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
