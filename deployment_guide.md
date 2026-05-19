# Deployment Guide: TalentBridge ATS System

This guide outlines step-by-step instructions for deploying your backend on **Render** and your frontend on **Vercel** to host the entire applicant tracking system in production.

---

## 📋 Prerequisites

Before starting, ensure you have accounts with the following services (all have free tiers):
1. **GitHub** (with your project code committed and pushed to a repository)
2. **MongoDB Atlas** (for cloud database hosting)
3. **Cloudinary** (for resume and cover letter file uploads)
4. **Render** (for the backend API server)
5. **Vercel** (for the frontend React single-page app)

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Cloud Database)

Since your backend will run in the cloud on Render, it cannot access your local computer's MongoDB (`127.0.0.1`).

1. Log in to [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) and create a **Shared (Free) Cluster**.
2. **Configure Database Security**:
   * Navigate to **Database Access** > **Add New Database User**. Define a username and password. Keep these handy.
3. **Configure Network Access**:
   * Navigate to **Network Access** > **Add IP Address**.
   * Choose **Allow Access from Anywhere** (adds IP `0.0.0.0/0`). 
   * *Why?* Render's serverless nodes rotate IP addresses dynamically. Restricting to a single IP will cause the backend connection to fail.
4. **Get Your Connection String**:
   * Go to **Database** > click **Connect** on your cluster.
   * Choose **Drivers** (Node.js).
   * Copy the connection string. It will look like this:
     ```env
     mongodb+srv://<username>:<password>@cluster0.xxxxxx.mongodb.net/ats_db?retryWrites=true&w=majority
     ```
   * Replace `<username>` and `<password>` with your database user credentials.

---

## 🚀 Step 2: Deploy Backend to Render

Render will host your Node.js/Express server and run it continuously.

1. Log in to [Render](https://render.com) and click **New** > **Web Service**.
2. Connect your GitHub account and select your project repository.
3. **Configure Web Service Parameters**:
   * **Name**: `talentbridge-backend` (or any custom name)
   * **Region**: Choose the region closest to you or your users.
   * **Branch**: `main` (or your active deployment branch)
   * **Root Directory**: `backend` *(Crucial: This tells Render to run commands inside the backend folder rather than the workspace root)*
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
   * **Instance Type**: `Free`
4. **Configure Environment Variables**:
   Click the **Advanced** button and add the following keys from your local `.env`:
   * `MONGO_URI`: *Your MongoDB Atlas connection string from Step 1*
   * `JWT_SECRET`: *Your JWT token signing key*
   * `CLOUDINARY_CLOUD_NAME`: *Your Cloudinary cloud name*
   * `CLOUDINARY_API_KEY`: *Your Cloudinary API key*
   * `CLOUDINARY_API_SECRET`: *Your Cloudinary API secret*
   * `GMAIL_USER`: *Your Gmail address for notifications*
   * `GMAIL_APP_PASSWORD`: *Your 16-character Gmail App password*
   * `GEMINI_API_KEY`: *Your Google Gemini API Key for mock interviews*
   * `NODE_ENV`: `production`
5. Click **Create Web Service**. 
6. Wait for the build to complete. Once active, copy the **Render URL** at the top left of the dashboard (e.g. `https://talentbridge-backend.onrender.com`).

> [!NOTE]
> **Render Free Tier Spin-Up**
> Render's free tier spins down web services after 15 minutes of inactivity. When a user visits the website after a quiet period, the first API request will trigger a cold-start, taking about 45–60 seconds for the server to wake up. This is normal free-tier behavior.

---

## 💻 Step 3: Deploy Frontend to Vercel

Vercel will host your static React application and build the optimized production bundle.

1. Log in to [Vercel](https://vercel.com) and click **Add New** > **Project**.
2. Import your GitHub repository.
3. **Configure Project Settings**:
   * **Framework Preset**: `Create React App`
   * **Root Directory**: `frontend` *(Crucial: Tells Vercel to build from the frontend folder)*
4. **Configure Build Settings**:
   * Keep default commands.
5. **Configure Environment Variables**:
   Under the **Environment Variables** section, add:
   * **Key**: `REACT_APP_API_URL`
   * **Value**: *Your Render backend URL from Step 2 (make sure there is no trailing slash, e.g., `https://talentbridge-backend.onrender.com`)*
6. Click **Deploy**.
7. Vercel will build your assets and generate your public frontend URL (e.g. `https://talentbridge-frontend.vercel.app`).

---

## 🔄 Verification & CORS Alignment

* Your backend uses `cors({ origin: '*' })` by default. This ensures that your frontend hosted on Vercel is allowed to make API calls to your Render backend without triggering CORS blockades.
* Open your Vercel frontend URL, register an account, and verify that uploads, emails, and the AI mock interview practice execute successfully in production!
