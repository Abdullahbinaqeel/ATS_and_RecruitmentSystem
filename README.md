# TalentBridge — Multi-Branch Recruitment & ATS

**TalentBridge** is a comprehensive Multi-Branch Recruitment & Applicant Tracking System (ATS) built with the MERN stack (MongoDB, Express.js, React.js, Node.js). It streamlines the hiring process by providing dedicated portals for Candidates and HR Administrators, complete with branch management, job listings, application tracking, interview scheduling, and automated email notifications.

## Tech Stack

- **Frontend:** React.js, React Router, Axios, Custom CSS (Rusty Dark Theme / Off-white Light Theme, react-icons)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Mongoose)
- **Authentication:** JWT (JSON Web Tokens) & bcryptjs
- **File Storage:** Cloudinary (Resumes & Cover Letters)
- **Email Service:** Gmail SMTP via Nodemailer
- **File Upload:** Multer

---

## Features

### Public Career Portal
- View all available jobs and search/filter by branch or department.
- Real-time job status (Open/Closed).
- Seamless apply process redirecting to Candidate Portal.

### Candidate Portal
- Register/Login with secure authentication.
- Profile management with circular profile pictures.
- Document management: Upload Resume (PDF) and Cover Letter (PDF/DOCX) via Cloudinary.
- Application tracking pipeline: *Submitted → Under Review → Shortlisted → Interview Scheduled → Rejected → Selected*.
- Track scheduled interviews and HR messages.

### HR / Admin Portal
- **Job Management:** Add, edit, delete jobs, set available seats, and assign branch locations.
- **Applicant Management:** View applicants, update statuses instantly, and access Cloudinary-hosted resumes.
- **Interview Management:** Schedule interviews with custom dates, times, and messages.
- **Email Communications:** Send automated emails for shortlisting, interview invitations, rejections, and custom messages.

### Branch Management
- Manage office locations (e.g., Islamabad, Lahore, Karachi, Remote).

---

## 📋 Prerequisites

Before running the project locally, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)

You will also need free accounts for the following services (or use local alternatives):
- **MongoDB Atlas** (Free M0 Cluster) OR **Local MongoDB** (via MongoDB Compass)
- **Cloudinary** (For storing resumes and profile pictures)
- **Google Account** (For Gmail SMTP App Password)

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd webProject
```

### 2. Backend Setup
Navigate to the `backend` directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory using the provided template:
```env
# Use this for MongoDB Atlas (Cloud)
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/ats_db
# OR use this for Local MongoDB (Compass)
# MONGO_URI=mongodb://localhost:27017/ats_db
JWT_SECRET=your_random_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
PORT=5000
```

### 3. Frontend Setup
Open a new terminal, navigate to the `frontend` directory, and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:
```env
REACT_APP_API_URL=http://localhost:5000
```

---

## Running the Application Locally

You can run both the frontend and backend concurrently using the provided shell script at the project root:

```bash
# From the root of the project (webProject/)
chmod +x run.sh  # Make script executable (if not already)
./run.sh
```

Alternatively, run them separately:
- **Backend:** `cd backend && npm run dev` (Runs on `http://localhost:5000`)
- **Frontend:** `cd frontend && npm start` (Runs on `http://localhost:3000`)

---

## 📂 Project Architecture

```
webProject/
├── backend/          # Node.js + Express API server
│   ├── config/       # Database connection
│   ├── middleware/   # JWT Auth & Multer upload logic
│   ├── models/       # Mongoose Schemas (User, Job, Application, etc.)
│   ├── routes/       # API endpoints
│   └── utils/        # Nodemailer email templates
│
├── frontend/         # React.js web application
│   ├── public/       # index.html
│   └── src/
│       ├── api/      # Axios instance with auth interceptors
│       ├── components/# Reusable UI (Navbar, JobCard, Loaders)
│       ├── context/  # Global AuthContext
│       └── pages/    # Candidate, HR, and Public route views
│
└── run.sh            # Concurrently start frontend and backend
```

For a deeper dive into the exact file creation sequence and architecture logic, refer to `FILE_SEQUENCE.md`.

---

## Deployment (Vercel)

Both the frontend and backend are optimized for Vercel deployment.
1. Import the repository into Vercel.
2. For the backend, set the root directory to `backend` and add all backend `.env` variables.
3. For the frontend, set the root directory to `frontend` and set `REACT_APP_API_URL` to your Vercel backend URL.

*Note: Vercel is highly recommended over Render because Render blocks SMTP ports (465 & 587), which prevents the Gmail integration from functioning.*

---

*Generated for: BSCS Semester Project — Web Development*
