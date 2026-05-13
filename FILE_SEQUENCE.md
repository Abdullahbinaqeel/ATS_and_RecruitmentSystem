# File Creation Sequence & Project Architecture Guide
## TalentBridge — Multi-Branch Recruitment & ATS

This document explains every file in the project, what it does, why it was created
in the order it was, and how all the pieces connect together.

---

## How the Project is Structured

```
claude coded/
├── backend/          ← Node.js + Express API server
│   ├── config/       ← Database connection setup
│   ├── middleware/   ← Functions that run BETWEEN a request and a response
│   ├── models/       ← MongoDB data schemas (what data looks like)
│   ├── routes/       ← API endpoint handlers (what happens at each URL)
│   └── utils/        ← Helper utilities (email sending)
│
└── frontend/         ← React.js web application
    ├── public/       ← Static HTML shell
    └── src/
        ├── api/      ← Axios HTTP client configuration
        ├── context/  ← Global state (who is logged in)
        ├── components/ ← Reusable UI building blocks
        └── pages/    ← Full page components (one per route/URL)
```

---

## Why This Order?

The sequence follows a strict dependency rule:
> **A file can only be created after everything it depends on already exists.**

Think of it like building a house:
1. Foundation first (database, config)
2. Structure next (models, middleware)
3. Rooms after (routes/pages)
4. Furniture last (UI components, styling)

---

# BACKEND — Creation Sequence

---

## STEP 1 — `backend/package.json`
**Created first because:** Every Node.js project starts with this file.
It tells Node.js what the project is named, which version it is, and most
importantly — which external packages (libraries) to download when you run `npm install`.

**Key dependencies declared here:**
| Package | What it does |
|---|---|
| `express` | The web server framework — handles HTTP requests |
| `mongoose` | Connects to MongoDB and lets you define data schemas |
| `dotenv` | Reads your `.env` secret file into `process.env` |
| `cors` | Allows the frontend (different port) to talk to the backend |
| `jsonwebtoken` | Creates and verifies JWT tokens for authentication |
| `bcryptjs` | Hashes passwords so they're never stored as plain text |
| `nodemailer` | Sends emails via Gmail SMTP |
| `multer` | Handles file uploads (resume, cover letter PDFs) |
| `cloudinary` | Cloud storage SDK for saving uploaded files |
| `multer-storage-cloudinary` | Bridges multer and Cloudinary |

---

## STEP 2 — `backend/.env.example`
**Created second because:** Before writing any code, we need to define what
secret values the code will need. This template file shows developers exactly
what environment variables to create in their own `.env` file without exposing
real secrets.

**Variables:**
```
MONGO_URI            ← MongoDB Atlas connection string
JWT_SECRET           ← Random string used to sign/verify tokens
CLOUDINARY_CLOUD_NAME ← Your Cloudinary account name
CLOUDINARY_API_KEY   ← Cloudinary public key
CLOUDINARY_API_SECRET ← Cloudinary private key (never share)
GMAIL_USER           ← Your Gmail address
GMAIL_APP_PASSWORD   ← 16-char app password (not your Gmail login)
PORT                 ← Which port the server listens on (default 5000)
```

---

## STEP 3 — `backend/config/db.js`
**Created third because:** Every other backend file needs the database to work.
This file exports a single `connectDB()` function that:
1. Reads `MONGO_URI` from `.env`
2. Calls `mongoose.connect()` to establish a connection to MongoDB Atlas
3. Logs success or crashes the server on failure

**Why a separate file?** `server.js` calls `connectDB()` once at startup.
Separating it keeps `server.js` clean and makes the DB connection easy to test.

---

## STEP 4 — `backend/models/User.js`
**Created fourth because:** Every other model, route, and piece of logic
references users. Defining the User first prevents circular dependency issues.

**What it defines:**
- `name`, `email` (unique), `password` (hashed), `role` ('candidate' | 'hr')
- `phone`, `address`, `profilePicture`, `resumeUrl`, `coverLetterUrl`
- A **pre-save hook**: automatically hashes the password with bcrypt before saving
- A `comparePassword()` method: safely checks a password against the stored hash

**Key concept — Mongoose Schema:**
A Schema is a blueprint for what a MongoDB document must look like.
`new mongoose.Schema({ field: type })` defines the shape.
`mongoose.model('User', schema)` creates a Model that can query the collection.

---

## STEP 5 — `backend/models/Branch.js`
**Created fifth because:** Jobs reference branches, so branches must exist first.

**What it defines:**
- `name` (unique), `city`, `address`
- Auto-seeding: if no branches exist in DB on first import, it inserts
  Islamabad, Lahore, Karachi, and Remote automatically

---

## STEP 6 — `backend/models/Job.js`
**Created sixth because:** Applications reference jobs (a candidate applies TO a job).
Jobs reference branches (a job is AT a branch).

**What it defines:**
- `title`, `department`, `description`, `requirements` (array of strings)
- `branch` — a reference (ObjectId) to a Branch document
- `seats`, `status` ('open' | 'closed')
- `postedBy` — reference to the HR User who created it

**Key concept — ref (relationships):**
`branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }` means
"store only the Branch's ID here, but when I call `.populate('branch')`,
fetch the full Branch document from the Branches collection."

---

## STEP 7 — `backend/models/Application.js`
**Created seventh because:** Interviews reference applications.
An Application links a Candidate to a Job.

**What it defines:**
- `candidate` — ref to User
- `job` — ref to Job
- `status` — the pipeline: submitted → under_review → shortlisted →
  interview_scheduled → rejected → selected
- `resumeUrl`, `coverLetterUrl` — Cloudinary URLs copied from user profile at apply time
- Compound unique index `{ candidate, job }` — prevents duplicate applications

---

## STEP 8 — `backend/models/Interview.js`
**Created eighth because:** Interviews depend on applications (you can't schedule
an interview without an application).

**What it defines:**
- `application` — ref to Application
- `scheduledDate`, `scheduledTime`, `message`
- `createdBy` — ref to the HR User who scheduled it

---

## STEP 9 — `backend/middleware/auth.js`
**Created ninth because:** All protected routes need this middleware.
Routes are created next, so middleware must exist first.

**What it exports:**

`protect` — Verifies the JWT token in the request's `Authorization` header.
If valid, it decodes the token and attaches the user object to `req.user`.
If invalid or missing, it returns a 401 Unauthorized response.

`hrOnly` — Checks that `req.user.role === 'hr'`. Called after `protect`.
Returns 403 Forbidden if the user is a candidate trying to access an HR route.

**Key concept — middleware:**
Express middleware is a function with signature `(req, res, next)`.
Calling `next()` passes control to the next middleware or route handler.
NOT calling `next()` stops the request pipeline — the response is sent here.

---

## STEP 10 — `backend/middleware/upload.js`
**Created tenth because:** Auth routes and application routes need file upload
capability, but upload depends on Cloudinary credentials from `.env`.

**What it exports:**
Three multer instances configured to upload directly to Cloudinary:
- `uploadResume` → saves to `ats/resumes/` folder, PDF only
- `uploadCoverLetter` → saves to `ats/cover-letters/`, PDF or DOCX
- `uploadProfilePic` → saves to `ats/profiles/`, JPG/PNG

After a successful upload, `req.file.path` contains the Cloudinary URL.

---

## STEP 11 — `backend/utils/email.js`
**Created eleventh because:** The HR routes need to send emails, but this
utility can be developed independently before routes exist.

**What it exports:**
- `sendEmail(to, subject, html)` — the core email sending function using Nodemailer + Gmail SMTP
- `shortlistEmail(name, jobTitle)` — returns `{ subject, html }` template
- `interviewEmail(name, jobTitle, date, time, message)` — interview invitation template
- `rejectionEmail(name, jobTitle)` — rejection notice template
- `customEmail(name, message)` — generic HR message template

All HTML templates use inline CSS so they render consistently in Gmail, Outlook, etc.

---

## STEP 12 — `backend/routes/auth.js`
**Created twelfth because:** Authentication must exist before any protected routes.
Every logged-in feature (applying, managing jobs) depends on having a valid token.

**Endpoints:**
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create account, return JWT |
| POST | `/api/auth/login` | None | Verify credentials, return JWT + user |
| GET | `/api/auth/me` | protect | Return current user's data |
| PUT | `/api/auth/profile` | protect | Update name, phone, address |
| POST | `/api/auth/upload/resume` | protect | Upload PDF resume to Cloudinary |
| POST | `/api/auth/upload/cover-letter` | protect | Upload cover letter to Cloudinary |
| POST | `/api/auth/upload/profile-pic` | protect | Upload profile photo to Cloudinary |

---

## STEP 13 — `backend/routes/branches.js`
**Created thirteenth because:** Jobs reference branches, so branch CRUD must exist
before job creation is possible.

**Endpoints:**
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/branches` | None | List all branches (public) |
| POST | `/api/branches` | HR | Add a new branch |
| PUT | `/api/branches/:id` | HR | Update branch info |
| DELETE | `/api/branches/:id` | HR | Remove a branch |

---

## STEP 14 — `backend/routes/jobs.js`
**Created fourteenth:** Job listings are the core product feature.

**Endpoints:**
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/jobs` | None | List all jobs (filter: branch, department, search, status) |
| GET | `/api/jobs/:id` | None | Get full job details |
| POST | `/api/jobs` | HR | Create a new job posting |
| PUT | `/api/jobs/:id` | HR | Edit a job posting |
| DELETE | `/api/jobs/:id` | HR | Delete a job posting |

---

## STEP 15 — `backend/routes/applications.js`
**Created fifteenth:** Applications link candidates to jobs — depends on both existing.

**Endpoints:**
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/applications` | Candidate | Apply to a job |
| GET | `/api/applications/my` | Candidate | See all my applications |
| GET | `/api/applications/job/:jobId` | HR | See all applicants for a job |
| PUT | `/api/applications/:id/status` | HR | Change application status |
| DELETE | `/api/applications/:id` | Candidate | Withdraw an application |

---

## STEP 16 — `backend/routes/interviews.js`
**Created sixteenth:** Interviews depend on applications existing.

**Endpoints:**
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/interviews` | HR | Schedule an interview |
| GET | `/api/interviews/my` | Candidate | See my scheduled interviews |
| GET | `/api/interviews/application/:id` | HR | Get interview for an application |
| PUT | `/api/interviews/:id` | HR | Update interview details |
| DELETE | `/api/interviews/:id` | HR | Cancel an interview |

---

## STEP 17 — `backend/routes/hr.js`
**Created seventeenth:** HR dashboard aggregates data from all other collections —
must be created last since it queries Users, Jobs, and Applications.

**Endpoints:**
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/hr/dashboard` | HR | Stats: totals, status breakdown, recent apps |
| POST | `/api/hr/email/:applicationId` | HR | Send email to a candidate |

---

## STEP 18 — `backend/server.js`
**Created last in backend because:** It imports everything else.
`server.js` is the entry point — the file Node.js runs when you type `npm start`.

**What it does in order:**
1. `require('dotenv').config()` — loads `.env` variables into `process.env`
2. `connectDB()` — connects to MongoDB Atlas
3. `app.use(cors())` — allows cross-origin requests from the frontend
4. `app.use(express.json())` — parses JSON request bodies
5. Mounts all route files under `/api`
6. Adds 404 and global error handlers
7. `app.listen(PORT)` — starts the HTTP server

---
---

# FRONTEND — Creation Sequence

---

## STEP 1 — `frontend/package.json`
**Created first because:** Like the backend, this defines project dependencies.

**Key dependencies:**
| Package | What it does |
|---|---|
| `react` | The core React library |
| `react-dom` | Renders React components into the browser DOM |
| `react-router-dom` | Handles navigation between pages without page reloads |
| `axios` | Makes HTTP requests to the backend API |
| `react-scripts` | The Create React App build tool |

---

## STEP 2 — `frontend/public/index.html`
**Created second because:** This is the only real HTML file. React injects the
entire app into the `<div id="root">` element here.

**What it includes:**
- Google Fonts: **Plus Jakarta Sans** (headings) and **Inter** (body text)
- Viewport meta tag for mobile responsiveness
- App title: "TalentBridge — Recruitment Portal"

---

## STEP 3 — `frontend/src/index.css`
**Created third because:** The CSS design tokens (variables like `--primary`, `--dark`)
are referenced by every component. Must exist before any JSX is rendered.

**Design system defined here:**
- Color palette (dark navy, electric blue, status colors)
- Typography scale
- Button styles (.btn, .btn-primary, .btn-dark, .btn-white…)
- Card styles (.card, .card-glass, .card-dark)
- Form styles (.form-input, .form-label, .form-group)
- Badge styles for each application status
- Modal, table, loader, empty-state patterns
- Responsive breakpoints at 768px and 480px
- CSS animations (fadeInUp, orbFloat, spin)

---

## STEP 4 — `frontend/src/index.js`
**Created fourth because:** This is React's entry point — the first file that runs.
It mounts the `<App />` component into the `<div id="root">` from `index.html`.

```js
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

---

## STEP 5 — `frontend/src/api/axios.js`
**Created fifth because:** Every page and component that fetches data uses this.
Creates a pre-configured Axios instance with:
- `baseURL` set to `process.env.REACT_APP_API_URL` (from `.env`)
- A **request interceptor** that auto-attaches the JWT token to every request header
- A **response interceptor** that clears auth data on 401 Unauthorized

---

## STEP 6 — `frontend/src/context/AuthContext.js`
**Created sixth because:** Many components need to know "who is logged in."
Without a context, you'd have to pass this data through props across 10+ levels.

**What it provides to all components:**
- `user` — the logged-in user object (or null)
- `isAuthenticated` — boolean
- `login(email, password)` — calls POST `/api/auth/login`, stores token
- `register(name, email, password, role)` — calls POST `/api/auth/register`
- `logout()` — clears token from localStorage
- `updateUser(data)` — updates user data in context after profile edits

**Session persistence:** On first load it checks localStorage for a saved token
and calls GET `/api/auth/me` to restore the session without requiring re-login.

---

## STEP 7 — `frontend/src/components/Loader.jsx`
**Created seventh because:** Many pages show loading spinners while fetching data.
Must exist before pages.

**Exports three variants:**
- `Loader` (default) — full-page spinner with dark background (used while auth loads)
- `SectionLoader` — centered spinner inside a section
- `InlineLoader` — tiny spinner inside submit buttons

---

## STEP 8 — `frontend/src/components/ProtectedRoute.jsx`
**Created eighth because:** The router (App.jsx) needs this to guard pages.

**How it works:**
- Wraps any page that requires login
- If not authenticated → redirects to `/login`
- If authenticated but wrong role → redirects to `/unauthorized`
- If all good → renders the children (the protected page)

---

## STEP 9 — `frontend/src/components/Navbar.jsx`
**Created ninth because:** It appears on every page (rendered in App.jsx above all routes).

**Features:**
- Transparent over the dark hero on the home page
- Transitions to frosted-glass white when the user scrolls down (CSS backdrop-filter)
- Shows different links based on role (candidate / HR / not logged in)
- Hamburger menu collapses to a dropdown on mobile

---

## STEP 10 — `frontend/src/components/Footer.jsx`
**Created tenth because:** Also appears on every page, rendered in App.jsx below all routes.

**Features:**
- Dark background matching the hero
- Brand column + navigation column + branches column
- "All systems operational" status dot

---

## STEP 11 — `frontend/src/components/JobCard.jsx`
**Created eleventh because:** Used by both the Home page and the Jobs page.
Must exist before those pages are created.

**Features:**
- Color-coded department chips (Engineering=blue, Design=orange, etc.)
- Status badge (Open/Closed)
- `timeAgo()` function shows "3 days ago" instead of raw ISO dates
- "View role →" link with animated arrow

---

## STEP 12 — `frontend/src/App.jsx`
**Created twelfth because:** It imports all pages and components, so they must all
exist first (or at least have placeholder files).

**What it does:**
- Wraps everything in `<BrowserRouter>` (enables URL routing)
- Wraps everything in `<AuthProvider>` (makes auth state available everywhere)
- Defines all 12 routes using React Router's `<Routes>` and `<Route>`
- Shows `<Navbar>` and `<Footer>` on every page
- Shows a loading screen while auth state is being restored on first render

---

## STEP 13 — `frontend/src/pages/Unauthorized.jsx`
**Created thirteenth:** Simple 403 page. Created early so ProtectedRoute can
redirect to it.

---

## STEP 14 — `frontend/src/pages/Login.jsx`
**Created fourteenth:** Split-screen design — dark brand panel left, white form right.
Calls `AuthContext.login()` and redirects based on role.

---

## STEP 15 — `frontend/src/pages/Register.jsx`
**Created fifteenth:** Same split-screen design as Login.
Has a role-toggle (Job Seeker / HR Recruiter) and password strength indicator.

---

## STEP 16 — `frontend/src/pages/Home.jsx`
**Created sixteenth:** The landing page. Fetches live data from the backend
to show real stats and job listings. Sections:
1. Dark immersive hero with animated gradient orbs and bold heading
2. Featured jobs grid (latest 6 open roles)
3. "How It Works" — 3 glass cards on dark background
4. Bottom CTA section

---

## STEP 17 — `frontend/src/pages/Jobs.jsx`
**Created seventeenth:** The main job listing page.
- Search bar (debounced 500ms so the API isn't called on every keystroke)
- Filters: branch (from API), department (hardcoded list), status
- Responsive grid of JobCard components
- "Showing X jobs" count

---

## STEP 18 — `frontend/src/pages/JobDetail.jsx`
**Created eighteenth:** Full detail view of a single job.
- Left column: description, requirements list
- Right sidebar: apply button (or "Already Applied" or "Login to Apply")
- Checks if current candidate has already applied (to prevent duplicates)
- HR users see Edit/Delete buttons instead

---

## STEP 19 — `frontend/src/pages/candidate/Dashboard.jsx`
**Created nineteenth:** The candidate's home screen after login.
- Stats row: total applications, shortlisted count, interviews count
- Applications table with status badges and Withdraw button
- Interviews section with date, time, job title, and HR message
- Documents section: links to uploaded resume/cover letter

---

## STEP 20 — `frontend/src/pages/candidate/Profile.jsx`
**Created twentieth:** Profile editor for candidates.
- Edit name, phone, address
- Circular profile picture with upload preview
- Resume upload (PDF only, sent via FormData to POST `/api/auth/upload/resume`)
- Cover letter upload

---

## STEP 21 — `frontend/src/pages/hr/Dashboard.jsx`
**Created 21st:** HR overview screen.
- 4 stat cards: Total Jobs, Total Applications, Total Candidates, Shortlisted
- Applications by Status: visual breakdown
- Recent Applications table (last 5)
- Quick Action cards: Post Job, Manage Jobs, Manage Branches

---

## STEP 22 — `frontend/src/pages/hr/ManageJobs.jsx`
**Created 22nd:** Full CRUD for job listings.
- Table of all jobs with Edit / Delete / View Applicants buttons
- Add/Edit modal with:
  - Dynamic requirements list (add/remove items with + button)
  - Branch dropdown populated from API
  - Department dropdown (hardcoded)
- Delete confirmation

---

## STEP 23 — `frontend/src/pages/hr/JobApplicants.jsx`
**Created 23rd:** Most complex HR page — lists all applicants for one job.
- Inline status dropdown (changes status immediately via PUT request)
- "Send Email" modal — 4 types: Shortlist / Interview / Rejection / Custom
- "Schedule Interview" modal — date, time, message fields
- Resume and Cover Letter links open Cloudinary URLs in a new tab

---

## STEP 24 — `frontend/src/pages/hr/ManageBranches.jsx`
**Created 24th (last) because:** Branches are the simplest CRUD — created last since
they depend on no other pages.
- Add / Edit / Delete branches in a clean card + table layout

---

# How Data Flows (Request Lifecycle)

Here's what happens when a candidate clicks "Apply Now" on a job:

```
1. Candidate clicks button in JobDetail.jsx
       ↓
2. React calls api.post('/api/applications', { jobId })
       ↓
3. axios.js interceptor adds: Authorization: Bearer <token>
       ↓
4. Express receives POST /api/applications in routes/applications.js
       ↓
5. middleware/auth.js (protect) verifies the JWT token
   → decodes it → attaches user to req.user
       ↓
6. Route handler creates a new Application document in MongoDB:
   { candidate: req.user._id, job: jobId, status: 'submitted',
     resumeUrl: user.resumeUrl }
       ↓
7. Returns { success: true, data: application } as JSON
       ↓
8. axios.js receives the response
       ↓
9. JobDetail.jsx updates state → button changes to "Applied ✓"
```

---

# Environment Variable Flow

```
.env file (never committed to GitHub)
    ↓
dotenv.config() in server.js reads it
    ↓
process.env.MONGO_URI      → config/db.js
process.env.JWT_SECRET     → middleware/auth.js, routes/auth.js
process.env.CLOUDINARY_*   → middleware/upload.js
process.env.GMAIL_*        → utils/email.js
process.env.PORT           → server.js
```

---

# Files You Must NEVER Commit to GitHub

| File | Why |
|---|---|
| `backend/.env` | Contains your MongoDB password, Cloudinary secret, Gmail password |
| `frontend/.env` | Contains your backend URL (less critical but good practice) |
| `backend/node_modules/` | Thousands of files — anyone can recreate with `npm install` |
| `frontend/node_modules/` | Same as above |

Both `.env` and `node_modules/` are already listed in `.gitignore` files.

---

# Running the Project

```bash
# Terminal 1 — Backend
cd backend
npm install        # download all packages listed in package.json
cp .env.example .env   # create your .env file
# fill in .env with real values
npm run dev        # starts server with auto-restart on file changes

# Terminal 2 — Frontend
cd frontend
npm install
cp .env.example .env
npm start          # opens http://localhost:3000 in browser
```

---

*Generated for: BSCS Semester Project — Web Development (BSCS 6F & 8F)*
*Stack: React.js + Node.js/Express + MongoDB Atlas + Cloudinary + Gmail SMTP*
