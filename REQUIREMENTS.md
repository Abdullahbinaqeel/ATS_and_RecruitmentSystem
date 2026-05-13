# ATS Project — Requirements & Setup Guide

## Project Overview
**Title:** Multi-Branch Recruitment & Applicant Tracking System (ATS)
**Stack:** React.js + Node.js/Express + MongoDB + Cloudinary + Gmail SMTP

---

## API Keys / Credentials Required

| Service | Environment Variable(s) | Where to Get |
|---|---|---|
| MongoDB Atlas | `MONGO_URI` | mongodb.com/cloud/atlas → Free M0 cluster → Connect → Copy connection string |
| Cloudinary | `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | cloudinary.com → Dashboard → API Keys |
| Gmail SMTP | `GMAIL_USER` `GMAIL_APP_PASSWORD` | Google Account → Security → 2FA → App Passwords → Generate for "Mail" |
| JWT | `JWT_SECRET` | Generate locally: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

---

## .env File Template (Backend)

```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/ats_db
JWT_SECRET=your_random_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
```

---

## .env File Template (Frontend)

```
REACT_APP_API_URL=http://localhost:5000
```

> After deployment, update `REACT_APP_API_URL` to your Vercel backend URL.

---

## Online Services to Sign Up For

All services below are **100% free, no credit card required**.

| Service | URL | Purpose | Cost |
|---|---|---|---|
| MongoDB Atlas | mongodb.com/cloud/atlas | Cloud database | Free M0 tier |
| Cloudinary | cloudinary.com | File storage (resumes, cover letters, profile pics) | Free (25GB) |
| Gmail | gmail.com | SMTP email sending | Free |
| GitHub | github.com | Version control + deployment trigger | Free |
| Vercel | vercel.com | Frontend (React) + Backend (Node.js serverless) deployment | Free, no credit card |

> **Why Vercel for both?**
> - The project doc lists Vercel as an alternative for backend and the recommended option for frontend.
> - **Render** (doc's recommended backend host) blocks SMTP ports 465 & 587 — Gmail email sending breaks entirely.
> - **Railway** (doc's other alternative) is only free for 30 days, then requires payment.
> - Vercel is the only doc-mentioned option that is **free + SMTP works**.

---

## Local Software to Install

All software below is **free and open source**.

| Software | Version | Purpose | Download |
|---|---|---|---|
| Node.js | v18+ | Backend runtime + npm | nodejs.org |
| Git | Latest | Version control | git-scm.com |
| VS Code | Latest | Code editor | code.visualstudio.com |

> Check Node.js: `node -v`
> Check Git: `git --version`

---

## Technology Stack (as specified in Project.docx)

| Layer | Technology | Cost |
|---|---|---|
| Frontend | React.js, React Router, Axios | Free |
| Backend | Node.js, Express.js | Free |
| Database | MongoDB Atlas (M0 cluster) | Free |
| File Storage | Cloudinary | Free |
| Email | Google App SMTP via Nodemailer | Free |
| Auth | JWT (JSON Web Tokens) | Free |
| File Upload | Multer + multer-storage-cloudinary | Free |
| Version Control | Git / GitHub | Free |
| Backend Deploy | Vercel (serverless) | Free |
| Frontend Deploy | Vercel | Free |

---

## Key npm Packages

### Backend
```
express mongoose dotenv cors jsonwebtoken bcryptjs
nodemailer multer cloudinary multer-storage-cloudinary
```

### Frontend
```
react-router-dom axios
```

---

## Database Collections

| Collection | Description |
|---|---|
| `users` | Candidates and HR/Admin accounts |
| `jobs` | Job listings with branch and department |
| `branches` | Islamabad, Lahore, Karachi, Remote |
| `applications` | Job applications with Cloudinary URLs for resume/cover letter |
| `interviews` | Interview schedules linked to applications |

---

## Features to Build

### Public Career Portal
- View all available jobs
- Search/filter jobs by branch or department
- View job details
- Apply online (redirects to register/login)

### Candidate Portal
- Register / Login
- Edit profile information
- Upload Resume (PDF only) via Cloudinary
- Upload Cover Letter (PDF/DOCX) via Cloudinary
- Apply for jobs
- View applied jobs
- Track application status:
  - Submitted → Under Review → Shortlisted → Interview Scheduled → Rejected → Selected

### HR/Admin Portal

**Job Management:**
- Add / Edit / Delete jobs
- Set available seats
- Assign branch location

**Applicant Management:**
- View applicants per job
- Shortlist candidates
- Reject candidates
- View resumes and candidate details (via Cloudinary URL)

**Interview Management:**
- Schedule interviews
- Set date/time
- Add custom message

**Email Communication (via Gmail SMTP):**
- Send shortlist email
- Send interview invitation email
- Send rejection email
- Send custom HR message

### Branch Management
- Islamabad
- Lahore
- Karachi
- Remote

---

## Setup Steps

### 1. MongoDB Atlas
1. Go to mongodb.com/cloud/atlas → create a free account
2. Create a new project → deploy a free **M0 cluster**
3. **Database Access** → Add a database user (set username + password)
4. **Network Access** → Add IP `0.0.0.0/0` (required for deployment servers)
5. **Clusters** → Connect → Connect your application → Copy the URI
6. Replace `<password>` in the URI with your database user's password
7. Save as `MONGO_URI` in your `.env` file

### 2. Cloudinary
1. Go to cloudinary.com → create a free account
2. Go to the **Dashboard**
3. Copy **Cloud Name**, **API Key**, and **API Secret**
4. Save all three in your `.env` file

### 3. Gmail App Password
1. Go to your Google Account → **Security**
2. Enable **2-Step Verification** if not already on
3. Search for **App Passwords** in the Security page
4. Generate a new App Password → name it "ATS Project"
5. Copy the 16-character password
6. Save as `GMAIL_APP_PASSWORD` in your `.env` file

### 4. Vercel (Backend + Frontend)
1. Go to vercel.com → sign up with GitHub (free, no credit card)
2. Click **Add New Project** → Import your GitHub repo
3. For the **backend**: set root directory to `/backend`, add all `.env` variables in Vercel dashboard under **Environment Variables**
4. For the **frontend**: set root directory to `/frontend`, set `REACT_APP_API_URL` to your deployed backend Vercel URL
5. Both deploy automatically on every GitHub push

---

## Marking Criteria

| Criteria | Marks |
|---|---|
| Frontend UI/UX | 20 |
| Backend APIs | 20 |
| Database Design | 15 |
| Functionality | 20 |
| Authentication & Security | 10 |
| Email Integration | 5 |
| Presentation / Viva | 10 |
| **Total** | **100** |

### Bonus Features (Optional)
- Admin Analytics Dashboard with Charts/Graphs
- Export Data to PDF/Excel
- Dark Mode UI
- Search & Advanced Filters
- SMS Notification Integration

---

## GitHub Requirements

- One shared repository per group
- All members must commit using their own GitHub accounts
- Use feature branches: `feature/login`, `feature/job-listing`, etc.
- Merge via Pull Requests
- Meaningful commit messages (e.g., `Add JWT auth middleware`)
- README.md must include project setup instructions and live deployment link
- Add `.env` to `.gitignore` — never commit secrets

---

## Deployment Checklist

- [ ] MongoDB Atlas cluster created and `MONGO_URI` saved
- [ ] Cloudinary account created and 3 keys saved
- [ ] Gmail App Password generated and saved
- [ ] GitHub repo created, `.env` added to `.gitignore`
- [ ] Backend deployed on Vercel with all env variables set in Vercel dashboard
- [ ] Frontend deployed on Vercel with `REACT_APP_API_URL` pointing to backend Vercel URL
- [ ] Live URLs added to README.md and project report
