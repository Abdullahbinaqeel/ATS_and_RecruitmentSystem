/*
 * ============================================================
 * backend/scripts/seed.js — Database Seeding Script
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Pre-populates the MongoDB database with realistic test data:
 *     - 1 HR Manager (login: hr@example.com / password123)
 *     - 2 Candidates (ali.khan@example.com, ayesha@example.com / password123)
 *     - 3 Job Postings (linked to seeded Branch locations)
 *     - 3 Applications in different status states
 *
 * HOW TO RUN IT:
 *   node backend/scripts/seed.js
 * ============================================================
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Branch = require('../models/Branch');
const Job = require('../models/Job');
const Application = require('../models/Application');
const PracticeInterview = require('../models/PracticeInterview');
const Interview = require('../models/Interview');

async function seedDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI is not defined in backend/.env');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully.');

    // 1. Clear existing collection data to start fresh
    console.log('🧹 Clearing existing users, jobs, applications, and interviews...');
    await User.deleteMany({});
    await Job.deleteMany({});
    await Application.deleteMany({});
    await PracticeInterview.deleteMany({});
    await Interview.deleteMany({});
    console.log('✅ Existing data cleared.');

    // 2. Query or Ensure Branches exist
    // Since Branch model has an IIFE that auto-seeds when loaded, we query them.
    let branches = await Branch.find({});
    if (branches.length === 0) {
      console.log('🌱 No branches found. Seeding default branches first...');
      branches = await Branch.insertMany([
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
    }
    console.log(`✅ Branches ready. Found ${branches.length} branches.`);

    // 3. Create Users
    console.log('👤 Hashing passwords and creating user profiles...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const hrManager = await User.create({
      name: 'Jane HR Manager',
      email: 'hr@example.com',
      password: hashedPassword,
      role: 'hr',
      phone: '+923001234567',
      address: 'F-8, Islamabad, Pakistan'
    });

    const candidateAli = await User.create({
      name: 'Ali Khan',
      email: 'ali.khan@example.com',
      password: hashedPassword,
      role: 'candidate',
      phone: '+923129876543',
      address: 'Gulberg, Lahore, Pakistan',
      skills: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'REST APIs'],
      education: [{
        degree: 'Bachelor of Science in Computer Science',
        institution: 'FAST NUCES',
        fieldOfStudy: 'Computer Science',
        startYear: 2020,
        endYear: 2024,
        grade: '3.6 CGPA'
      }]
    });

    const candidateAyesha = await User.create({
      name: 'Ayesha Ahmed',
      email: 'ayesha@example.com',
      password: hashedPassword,
      role: 'candidate',
      phone: '+923335557777',
      address: 'Clifton, Karachi, Pakistan',
      skills: ['Python', 'SQL', 'Data Analytics', 'Pandas', 'Scikit-Learn', 'PowerBI'],
      education: [{
        degree: 'Master of Science in Data Science',
        institution: 'NUST',
        fieldOfStudy: 'Data Science',
        startYear: 2021,
        endYear: 2023,
        grade: '3.8 CGPA'
      }]
    });

    console.log('✅ Users seeded successfully:');
    console.log(`   - HR: ${hrManager.email} (password123)`);
    console.log(`   - Candidate 1: ${candidateAli.email} (password123)`);
    console.log(`   - Candidate 2: ${candidateAyesha.email} (password123)`);

    // 4. Create Job Postings
    console.log('💼 Seeding job postings...');
    const branchIslamabad = branches.find(b => b.name.includes('Islamabad')) || branches[0];
    const branchLahore = branches.find(b => b.name.includes('Lahore')) || branches[0];
    const branchRemote = branches.find(b => b.name.includes('Remote')) || branches[0];

    const jobJuniorDev = await Job.create({
      title: 'Junior Software Developer',
      department: 'Engineering',
      description: 'We are looking for a motivated Junior Software Developer to join our growing engineering team. In this role, you will help design, build, and maintain our web applications. You will work closely with senior developers to write clean, testable code and resolve technical issues.',
      requirements: ['Basic understanding of HTML, CSS, and modern JavaScript (ES6+)', 'Familiarity with React.js or Node.js is a strong plus', 'Familiarity with Git/GitHub version control', 'Eager to learn and collaborate in an agile environment'],
      branch: branchLahore._id,
      seats: 3,
      postedBy: hrManager._id
    });

    const jobDataScientist = await Job.create({
      title: 'Data Scientist',
      department: 'Data Science',
      description: 'Join our Analytics & Insights team to help translate raw data into actionable business intelligence. You will build predictive models, design statistical experiments, and create interactive dashboards to showcase insights to key stakeholders.',
      requirements: ['Proficiency in Python (Pandas, Numpy, Scikit-Learn)', 'Strong relational database knowledge (SQL)', 'Experience with data visualization tools (Matplotlib, PowerBI or Tableau)', 'Strong communication skills to explain technical concepts to non-technical business teams'],
      branch: branchIslamabad._id,
      seats: 1,
      postedBy: hrManager._id
    });

    const jobSeniorFullStack = await Job.create({
      title: 'Senior Full Stack Developer',
      department: 'Engineering',
      description: 'We are seeking a Senior Full Stack Developer to spearhead our frontend architecture and Node backend scaling. You will lead features end-to-end, mentor junior engineers, and improve system performance.',
      requirements: ['5+ years of software development experience', 'Extensive experience with MERN stack (MongoDB, Express, React, Node.js)', 'Experience deploying scalable applications on cloud infrastructure', 'Deep understanding of web security, REST APIs, and asynchronous programming'],
      branch: branchRemote._id,
      seats: 2,
      postedBy: hrManager._id
    });

    console.log('✅ Job postings seeded successfully.');

    // 5. Create Applications
    console.log('📝 Seeding job applications...');
    
    // Application 1: Ali Khan -> Junior Dev (shortlisted)
    await Application.create({
      candidate: candidateAli._id,
      job: jobJuniorDev._id,
      status: 'shortlisted',
      resumeUrl: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample_resume.pdf',
      coverLetterUrl: '',
      notes: 'Strong candidate. Completed assignments successfully.'
    });

    // Application 2: Ali Khan -> Senior Full Stack (submitted)
    await Application.create({
      candidate: candidateAli._id,
      job: jobSeniorFullStack._id,
      status: 'submitted',
      resumeUrl: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample_resume.pdf',
      coverLetterUrl: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample_cover_letter.pdf',
    });

    // Application 3: Ayesha Ahmed -> Data Scientist (under_review)
    await Application.create({
      candidate: candidateAyesha._id,
      job: jobDataScientist._id,
      status: 'under_review',
      resumeUrl: 'https://res.cloudinary.com/demo/image/upload/v1234567890/ayesha_resume.pdf',
      coverLetterUrl: '',
    });

    console.log('✅ Applications seeded successfully.');
    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

seedDatabase();
