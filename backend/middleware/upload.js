/*
 * ============================================================
 * middleware/upload.js — File Upload Configuration
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Configures file uploads using three npm packages working
 *   together, and exports three ready-to-use upload middlewares.
 *
 * THE THREE PACKAGES:
 *   1. cloudinary         — A cloud service (cloudinary.com) that
 *                           stores files (images, PDFs, etc.) and
 *                           returns a permanent public URL.
 *                           We never store files on our own server
 *                           because server storage is volatile
 *                           (restarts, deploys wipe local files).
 *
 *   2. multer             — A Node.js middleware for handling
 *                           multipart/form-data, which is the
 *                           format browsers use when submitting
 *                           files via an HTML <input type="file">.
 *                           Without multer, req.body has nothing
 *                           when files are involved.
 *
 *   3. multer-storage-cloudinary — A "storage engine" plugin that
 *                           connects multer directly to Cloudinary.
 *                           Instead of saving files to disk first,
 *                           multer streams them directly to the
 *                           cloud. After upload, req.file.path
 *                           contains the Cloudinary URL.
 *
 * THE THREE UPLOAD INSTANCES:
 *   uploadResume       — PDF only  → stored in ats/resumes
 *   uploadCoverLetter  — PDF/DOCX  → stored in ats/cover-letters
 *   uploadProfilePic   — JPG/PNG   → stored in ats/profiles
 *
 * HOW TO USE IN A ROUTE:
 *   router.post('/upload/resume', protect, uploadResume.single('resume'), handler)
 *   The string 'resume' matches the <input name="resume"> in the HTML form.
 *   After multer runs, req.file.path is the Cloudinary URL of the uploaded file.
 *
 * HOW IT FITS IN THE SYSTEM:
 *   routes/auth.js uses all three upload instances so users can
 *   upload their resume, cover letter, and profile picture.
 * ============================================================
 */

// ── Imports ──────────────────────────────────────────────────
// cloudinary.v2 is the latest version of the Cloudinary SDK
const cloudinary = require('cloudinary').v2;

// CloudinaryStorage is a class that acts as a multer storage engine
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// multer handles reading the multipart/form-data from the request
const multer = require('multer');

// ── Cloudinary Configuration ─────────────────────────────────
/*
 * Before we can upload anything, we tell the SDK which Cloudinary
 * account to use by providing credentials. These come from the
 * Cloudinary dashboard (cloudinary.com) and are stored in .env
 * so they're never hard-coded into source code.
 *
 *   CLOUDINARY_CLOUD_NAME   — your account's unique name (e.g., "myapp123")
 *   CLOUDINARY_API_KEY      — public identifier for your account
 *   CLOUDINARY_API_SECRET   — secret used to authenticate API calls
 *                             (treat this like a password!)
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Helper: File Filter Factory ──────────────────────────────
/*
 * A multer "fileFilter" is a function called before the file is
 * saved. It decides whether to accept or reject the file based
 * on its MIME type.
 *
 * WHAT IS A MIME TYPE?
 *   MIME (Multipurpose Internet Mail Extensions) types describe
 *   the nature and format of a file. Examples:
 *     'application/pdf'  — PDF document
 *     'image/jpeg'       — JPEG image
 *     'image/png'        — PNG image
 *
 * createFileFilter is a "factory function" — a function that
 * RETURNS another function. We call it with an array of allowed
 * MIME types and it gives back the actual multer fileFilter.
 *
 * Why a factory? So we can reuse the same logic for all three
 * upload types by just changing the allowed list.
 */
const createFileFilter = (allowedMimes) => (req, file, cb) => {
  /*
   * The inner function receives:
   *   req  — the Express request (not usually needed here)
   *   file — the incoming file with metadata: file.mimetype, file.originalname, etc.
   *   cb   — a Node.js-style callback: cb(error, accept)
   *          call cb(null, true)  to ACCEPT the file
   *          call cb(error, false) to REJECT the file
   */
  if (allowedMimes.includes(file.mimetype)) {
    // File type is in the allowed list — accept it
    cb(null, true);
  } else {
    // File type is not allowed — reject with an error
    cb(
      new Error(
        `Invalid file type. Allowed types: ${allowedMimes.join(', ')}`
      ),
      false // false = don't save this file
    );
  }
};

// ── 1. Resume Upload ─────────────────────────────────────────
/*
 * STORAGE: CloudinaryStorage tells multer WHERE and HOW to store the file.
 *
 * 'resource_type: raw' is important for non-image files (like PDFs).
 * Cloudinary has three resource types:
 *   image  — for images (JPG, PNG, GIF, etc.)
 *   video  — for videos
 *   raw    — for everything else (PDFs, DOCX, ZIPs, etc.)
 * Using 'image' for a PDF would cause an error.
 *
 * 'use_filename: true' keeps the original file name (e.g., "john_resume.pdf")
 * 'unique_filename: true' adds a random suffix so two files with the same
 * name don't collide in Cloudinary storage.
 */
const resumeStorage = new CloudinaryStorage({
  cloudinary: cloudinary, // use the configured cloudinary instance above
  params: {
    folder: 'ats/resumes',       // where in Cloudinary to store the file
    resource_type: 'raw',        // PDFs are not images — must use 'raw'
    allowed_formats: ['pdf'],    // only PDFs allowed at the Cloudinary level too
    use_filename: true,          // keep original filename
    unique_filename: true        // add random suffix to prevent name collisions
  }
});

/*
 * multer() combines storage + fileFilter + size limits into one
 * middleware object. We call .single('resume') later in the route
 * to tell multer to expect exactly one file in the 'resume' field.
 */
const uploadResume = multer({
  storage: resumeStorage,                              // where to store the file
  fileFilter: createFileFilter(['application/pdf']),  // only accept PDFs
  limits: {
    fileSize: 5 * 1024 * 1024  // max 5 MB (5 * 1024 bytes/KB * 1024 bytes/MB)
  }
});

// ── 2. Cover Letter Upload ───────────────────────────────────
// Same pattern as resume but allows both PDF and DOCX formats.
const coverLetterStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ats/cover-letters',
    resource_type: 'raw',
    allowed_formats: ['pdf', 'docx'],
    use_filename: true,
    unique_filename: true
  }
});

const uploadCoverLetter = multer({
  storage: coverLetterStorage,
  fileFilter: createFileFilter([
    'application/pdf',
    /*
     * The MIME type for .docx files is this long string — it's the
     * official Microsoft Office Open XML format identifier.
     * 'docx' is just the extension; this is the actual type the
     * browser reports when a user picks a .docx file.
     */
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  limits: {
    fileSize: 5 * 1024 * 1024  // 5 MB limit
  }
});

// ── 3. Profile Picture Upload ────────────────────────────────
/*
 * For images, we use resource_type: 'image' so Cloudinary can
 * apply transformations (resize, crop, optimize) automatically.
 *
 * The 'transformation' array tells Cloudinary to resize and crop
 * every uploaded image to 400x400 pixels:
 *   crop: 'fill'     — fill the box, cropping edges as needed
 *   gravity: 'face'  — center the crop on the detected face
 * This keeps profile pictures consistent in size everywhere.
 */
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ats/profiles',
    resource_type: 'image',          // images go with type 'image'
    allowed_formats: ['jpg', 'jpeg', 'png'],
    use_filename: true,
    unique_filename: true,
    // Automatically resize to a uniform profile picture size
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
  }
});

const uploadProfilePic = multer({
  storage: profileStorage,
  fileFilter: createFileFilter(['image/jpg', 'image/jpeg', 'image/png']),
  limits: {
    fileSize: 2 * 1024 * 1024  // 2 MB limit — profile pics should be small
  }
});

// ── Export ───────────────────────────────────────────────────
// Export all three instances so route files can import them.
// Usage: const { uploadResume } = require('../middleware/upload')
module.exports = { uploadResume, uploadCoverLetter, uploadProfilePic };
