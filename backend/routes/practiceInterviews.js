/*
 * ============================================================
 * routes/practiceInterviews.js — AI Practice Interview Routes
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Handles all API actions for the AI Practice Interview feature:
 *     - GET /api/practice-interviews/application/:applicationId
 *     - POST /api/practice-interviews/start
 *     - POST /api/practice-interviews/:interviewId/message
 *     - POST /api/practice-interviews/:interviewId/complete
 *     - DELETE /api/practice-interviews/:interviewId
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const PracticeInterview = require('../models/PracticeInterview');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { generateNextPracticeMessage, evaluatePracticeInterview } = require('../utils/gemini');

// Helper to compile the system interviewer instruction
const makeInterviewerPrompt = (job, candidate) => {
  const reqStr = job.requirements && job.requirements.length > 0
    ? job.requirements.join(', ')
    : 'Not explicitly listed';

  const skillsStr = candidate.skills && candidate.skills.length > 0
    ? candidate.skills.join(', ')
    : 'Not listed';

  const eduStr = candidate.education && candidate.education.length > 0
    ? candidate.education.map(e => `${e.degree || 'Degree'} from ${e.institution || 'Institution'}`).join(', ')
    : 'Not listed';

  return `You are an experienced, professional AI interviewer conducting a simulated mock interview.
Role: You are interviewing the candidate for the position of "${job.title}" in the "${job.department}" department.
Job Description: "${job.description}"
Job Requirements: ${reqStr}

Candidate Profile:
Name: "${candidate.name}"
Skills: ${skillsStr}
Education: ${eduStr}

Rules for the interview:
1. Be encouraging, realistic, and professional, like a real hiring manager.
2. Ask ONE question at a time. Do not dump a list of questions in a single response.
3. Ask questions that test the candidate's skills, qualifications, and alignment with the job requirements.
4. Keep the conversation engaging and natural.
5. The interview should last exactly 5 questions.
6. Once the user replies to the 5th question, thank them, conclude the interview, and instruct them to click "Complete & Get Feedback" button at the top/bottom of the page to generate their report.
7. Start by greeting the candidate, introducing yourself briefly, and asking the first question (e.g. asking them to introduce themselves or explaining why they applied for the "${job.title}" role).`;
};

// ── GET /application/:applicationId — Fetch practice session status ─────
router.get('/application/:applicationId', protect, async (req, res) => {
  try {
    const practice = await PracticeInterview.findOne({
      candidate: req.user._id,
      application: req.params.applicationId
    }).populate('job', 'title department');

    let application = null;
    if (!practice) {
      application = await Application.findById(req.params.applicationId)
        .populate('job', 'title department description requirements');
      
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found.'
        });
      }

      if (application.candidate.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this application.'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: practice,
      application: application
    });
  } catch (error) {
    console.error('Fetch practice interview error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving practice interview.',
      error: error.message
    });
  }
});

// ── POST /start — Initialize practice interview ─────────────────────────
router.post('/start', protect, async (req, res) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required to start a practice session.'
      });
    }

    // Find the application and ensure it belongs to the candidate
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.'
      });
    }

    if (application.candidate.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only practice for your own applications.'
      });
    }

    // Check if practice session already exists
    let practice = await PracticeInterview.findOne({
      candidate: req.user._id,
      application: applicationId
    });

    if (practice) {
      return res.status(200).json({
        success: true,
        message: 'Active practice session retrieved.',
        data: practice
      });
    }

    // Fetch full job and candidate info to build the initial AI prompt
    const job = await Job.findById(application.job);
    const candidate = await User.findById(req.user._id);

    if (!job || !candidate) {
      return res.status(404).json({
        success: false,
        message: 'Associated Job or Candidate profile not found.'
      });
    }

    const systemPrompt = makeInterviewerPrompt(job, candidate);

    // Call Gemini API to generate the initial greeting and first question
    const firstQuestion = await generateNextPracticeMessage(systemPrompt, []);

    // Create the session
    practice = await PracticeInterview.create({
      candidate: req.user._id,
      job: job._id,
      application: applicationId,
      status: 'in_progress',
      messages: [
        {
          role: 'model',
          parts: [{ text: firstQuestion }]
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'AI mock interview session started.',
      data: practice
    });
  } catch (error) {
    console.error('Start practice interview error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error starting practice session.',
      error: error.message
    });
  }
});

// ── POST /:interviewId/message — Send a message and get response ───────
router.post('/:interviewId/message', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty.'
      });
    }

    // Find session and verify candidate ownership
    const practice = await PracticeInterview.findById(req.params.interviewId);
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found.'
      });
    }

    if (practice.candidate.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this session.'
      });
    }

    if (practice.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send messages to a completed interview.'
      });
    }

    // Push candidate message
    practice.messages.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Populate job and user to get details for prompts
    const job = await Job.findById(practice.job);
    const candidate = await User.findById(req.user._id);
    const systemPrompt = makeInterviewerPrompt(job, candidate);

    // Format chat history for Gemini API
    const formattedHistory = practice.messages.map(msg => ({
      role: msg.role,
      parts: msg.parts.map(p => ({ text: p.text }))
    }));

    // Generate next question
    const aiResponse = await generateNextPracticeMessage(systemPrompt, formattedHistory);

    // Push AI response
    practice.messages.push({
      role: 'model',
      parts: [{ text: aiResponse }]
    });

    await practice.save();

    return res.status(200).json({
      success: true,
      data: practice
    });
  } catch (error) {
    console.error('Send message error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error responding to message.',
      error: error.message
    });
  }
});

// ── POST /:interviewId/complete — Conclude and generate feedback ────────
router.post('/:interviewId/complete', protect, async (req, res) => {
  try {
    const practice = await PracticeInterview.findById(req.params.interviewId);
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found.'
      });
    }

    if (practice.candidate.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this session.'
      });
    }

    // Fetch info to build prompt
    const job = await Job.findById(practice.job);
    const candidate = await User.findById(req.user._id);

    const evaluationPrompt = `You are an expert HR evaluator. Evaluate the following mock interview chat history for the position of "${job.title}" in the "${job.department}" department.
Analyze the candidate's answers based on their profile, skills, education, and the job requirements.

Provide your evaluation strictly as a JSON object matching this structure:
{
  "feedback": "Detailed review in clean Markdown format. You MUST use standard markdown. Organize it with sections: ### Overall Impression, ### Key Strengths (list 2-3 points), and ### Areas for Improvement (list 2-3 points). Make it encouraging yet professional.",
  "score": 85
}

Ensure the output is a valid JSON block containing only 'feedback' (string) and 'score' (number) fields. Do not include any JSON wrapper markdown (like \`\`\`json) outside the object in the final raw API output if possible, but write valid parseable JSON.`;

    // Format transcript for Gemini
    const formattedHistory = practice.messages.map(msg => ({
      role: msg.role,
      parts: msg.parts.map(p => ({ text: p.text }))
    }));

    // Call Gemini API to evaluate
    const evaluation = await evaluatePracticeInterview(evaluationPrompt, formattedHistory);

    // Save evaluation & complete session
    practice.feedback = evaluation.feedback;
    practice.score = evaluation.score;
    practice.status = 'completed';

    await practice.save();

    return res.status(200).json({
      success: true,
      message: 'Practice interview completed and evaluated successfully.',
      data: practice
    });
  } catch (error) {
    console.error('Complete practice error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error completing practice interview.',
      error: error.message
    });
  }
});

// ── DELETE /:interviewId — Reset / Delete practice session ───────────────
router.delete('/:interviewId', protect, async (req, res) => {
  try {
    const practice = await PracticeInterview.findById(req.params.interviewId);
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found.'
      });
    }

    if (practice.candidate.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this session.'
      });
    }

    await PracticeInterview.findByIdAndDelete(req.params.interviewId);

    return res.status(200).json({
      success: true,
      message: 'Practice session reset successfully.'
    });
  } catch (error) {
    console.error('Reset practice session error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error resetting practice session.',
      error: error.message
    });
  }
});

module.exports = router;
