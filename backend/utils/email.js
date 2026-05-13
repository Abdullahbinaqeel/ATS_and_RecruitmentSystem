/*
 * ============================================================
 * utils/email.js — Email Sending Utility
 * ============================================================
 * WHAT THIS FILE DOES:
 *   1. Configures Nodemailer to send emails via Gmail's SMTP server.
 *   2. Exports a core sendEmail() function that sends one email.
 *   3. Exports four email template functions — each returns a
 *      { subject, html } object ready to pass into sendEmail().
 *
 * WHAT IS SMTP?
 *   SMTP (Simple Mail Transfer Protocol) is the internet standard
 *   for sending email. Gmail provides an SMTP server that lets
 *   authorized apps send emails on behalf of a Gmail account.
 *   When this server calls Gmail's SMTP, Gmail delivers the email
 *   to the recipient's inbox exactly like a regular email.
 *
 * WHAT IS NODEMAILER?
 *   Nodemailer is the most popular Node.js library for sending
 *   email. You configure a "transporter" (your SMTP credentials)
 *   once, then call transporter.sendMail() to send emails.
 *
 * GMAIL APP PASSWORD SETUP:
 *   Google blocks apps from using your regular Gmail password.
 *   You must use a 16-character "App Password":
 *     1. Enable 2-Step Verification on your Google account
 *     2. Go to Google Account → Security → 2-Step Verification
 *        → App Passwords
 *     3. Create one for "Mail" and copy the 16-char code
 *     4. Put it in .env as GMAIL_APP_PASSWORD
 *
 * EMAIL TEMPLATE FUNCTIONS:
 *   shortlistEmail(name, jobTitle)                  → shortlist notification
 *   interviewEmail(name, jobTitle, date, time, msg) → interview invitation
 *   rejectionEmail(name, jobTitle)                  → rejection notice
 *   customEmail(name, message)                      → free-form HR message
 *
 * HOW IT FITS IN THE SYSTEM:
 *   routes/hr.js imports all four template functions and sendEmail,
 *   picks the right template based on the 'type' in the request,
 *   and calls sendEmail() with the result.
 * ============================================================
 */

// ── Import ──────────────────────────────────────────────────
// nodemailer is the npm package for sending email from Node.js
const nodemailer = require('nodemailer');

// ── Create the Nodemailer Transporter ───────────────────────
/*
 * A "transporter" is Nodemailer's configured email connection.
 * We create it ONCE at module load time and reuse it for every
 * email sent — this is more efficient than creating a new
 * connection per email.
 *
 * createTransport({ service: 'gmail', auth: {...} }) tells
 * Nodemailer to use Gmail's SMTP settings (host, port, TLS, etc.)
 * automatically. The 'gmail' shorthand includes all these details.
 *
 * GMAIL_USER        = your full Gmail address (e.g., ats@gmail.com)
 * GMAIL_APP_PASSWORD = the 16-char App Password from Google (NOT your regular password)
 *
 * Both values live in .env so they're never in source code.
 */
const transporter = nodemailer.createTransport({
  service: 'gmail', // 'gmail' is a built-in Nodemailer shortcut for Gmail SMTP
  auth: {
    user: process.env.GMAIL_USER,         // Gmail address sending the email
    pass: process.env.GMAIL_APP_PASSWORD  // 16-char App Password (not regular password)
  }
});

// ── Core: sendEmail() ───────────────────────────────────────
/*
 * sendEmail() is the single function that actually sends emails.
 * All four template functions ultimately lead to this function.
 *
 * Parameters:
 *   to      (string) — recipient's email address
 *   subject (string) — email subject line (displayed in inbox)
 *   html    (string) — full HTML content of the email body
 *
 * Returns: Promise that resolves with Nodemailer's info object
 * (includes messageId, accepted/rejected recipients, etc.)
 *
 * async/await used because SMTP is a network call — it takes time.
 */
const sendEmail = async (to, subject, html) => {
  /*
   * mailOptions describes the email to send.
   * 'from' uses a friendly name format: "Name <email@address>"
   * This is what recipients see as the sender in their inbox.
   * template literals (backticks) let us embed variables with ${}.
   */
  const mailOptions = {
    from: `"ATS Recruitment System" <${process.env.GMAIL_USER}>`,
    to,      // recipient address (passed as parameter)
    subject, // subject line (passed as parameter)
    html     // HTML body (passed as parameter)
  };

  /*
   * transporter.sendMail() submits the email to Gmail's SMTP server.
   * This is async — it waits for Gmail to accept the email.
   * If Gmail rejects it (wrong credentials, rate limit, etc.) it throws.
   *
   * 'info' contains metadata about the sent email:
   *   info.messageId   — unique ID assigned by Gmail
   *   info.accepted    — array of addresses that accepted the email
   *   info.rejected    — array of addresses that rejected the email
   */
  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to} | Message ID: ${info.messageId}`);
  return info;
};

// ── Shared CSS Styles ───────────────────────────────────────
/*
 * Why inline styles?
 *   Many email clients (especially Outlook, Apple Mail) do not
 *   support <style> tags or CSS classes. They strip them out.
 *   The only reliable way to style email HTML is with inline
 *   style attributes on every element: <p style="color: red;">
 *
 *   We define common style strings as constants here to avoid
 *   copy-pasting them in every template.
 */

// Outer container: centered, max 600px wide, light gray background
const baseContainerStyle =
  'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 0; border-radius: 8px; overflow: hidden;';

// Blue header section (used for shortlist and interview emails)
const headerStyle =
  'background: #1a73e8; color: #ffffff; padding: 24px 32px;';

// White body section where the main message goes
const bodyStyle =
  'padding: 32px; background: #ffffff;';

// Gray footer with "do not reply" note
const footerStyle =
  'background: #f1f3f4; padding: 16px 32px; text-align: center; color: #5f6368; font-size: 12px;';

// Light blue info box (used for "what happens next?" sections)
const highlightBoxStyle =
  'background: #e8f0fe; border-left: 4px solid #1a73e8; padding: 16px; margin: 16px 0; border-radius: 4px;';

// Dark red header (used only for rejection emails to distinguish tone)
const rejectionHeaderStyle =
  'background: #c62828; color: #ffffff; padding: 24px 32px;';

// ── Helper: wrapEmail() ─────────────────────────────────────
/*
 * wrapEmail() builds the full HTML email document by wrapping
 * header and body sections in the standard email shell.
 *
 * Parameters:
 *   headerHtml — HTML content for the colored header band
 *   bodyHtml   — HTML content for the white body section
 *   headerBg   — (optional) which header style to use
 *                defaults to blue headerStyle
 *
 * Returns a complete HTML string ready to send as an email.
 *
 * Template literals (backtick strings) allow multi-line strings
 * and ${variable} interpolation — perfect for building HTML.
 */
const wrapEmail = (headerHtml, bodyHtml, headerBg = headerStyle) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0; padding:0; background:#f9f9f9;">
  <div style="${baseContainerStyle}">
    <div style="${headerBg}">
      ${headerHtml}
    </div>
    <div style="${bodyStyle}">
      ${bodyHtml}
    </div>
    <div style="${footerStyle}">
      <p style="margin:0;">This email was sent by the ATS Recruitment System. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

// ── Email Template Functions ─────────────────────────────────
/*
 * Each function returns { subject, html }:
 *   subject — the email subject line
 *   html    — the full HTML document to send as the body
 *
 * Template functions are "pure" — they take data in, return
 * content out, no side effects. sendEmail() handles the actual
 * network call. This separation makes templates easy to test.
 */

// ── 1. Shortlist Email ───────────────────────────────────────
/*
 * Sent when HR marks an application as 'shortlisted'.
 * Tells the candidate they made the cut and to expect a call.
 *
 * Parameters:
 *   candidateName (string) — the candidate's full name
 *   jobTitle      (string) — the job they applied for
 */
const shortlistEmail = (candidateName, jobTitle) => {
  const subject = `Congratulations! You've been shortlisted for ${jobTitle}`;
  const html = wrapEmail(
    // Header content — shown in blue band at top
    `<h1 style="margin:0; font-size:24px;">Great News!</h1>
     <p style="margin:8px 0 0; opacity:0.9;">Application Update</p>`,
    // Body content — main message
    `<p style="color:#202124; font-size:16px;">Dear <strong>${candidateName}</strong>,</p>
     <p style="color:#202124; line-height:1.6;">
       We are pleased to inform you that your application for the position of
       <strong>${jobTitle}</strong> has been reviewed and you have been
       <strong style="color:#1a73e8;">shortlisted</strong> for the next stage of our recruitment process.
     </p>
     <div style="${highlightBoxStyle}">
       <p style="margin:0; color:#1a73e8; font-weight:bold;">What happens next?</p>
       <p style="margin:8px 0 0; color:#202124;">
         Our HR team will reach out to you shortly to schedule an interview.
         Please ensure your contact details are up to date.
       </p>
     </div>
     <p style="color:#202124; line-height:1.6;">
       Thank you for your interest in joining our team. We look forward to speaking with you!
     </p>
     <p style="color:#202124;">Best regards,<br><strong>HR Team</strong><br>ATS Recruitment</p>`
  );
  return { subject, html };
};

// ── 2. Interview Email ───────────────────────────────────────
/*
 * Sent when HR schedules an interview.
 * Includes the date, time, and an optional message from HR.
 *
 * Parameters:
 *   candidateName (string) — candidate's full name
 *   jobTitle      (string) — the job position
 *   date          (Date|string) — the interview date
 *   time          (string) — the interview time (e.g., "10:30 AM")
 *   message       (string) — optional note from HR
 */
const interviewEmail = (candidateName, jobTitle, date, time, message) => {
  const subject = `Interview Scheduled — ${jobTitle}`;

  /*
   * Format the date into a readable string like:
   *   "Monday, August 15, 2024"
   *
   * new Date(date) works with both Date objects and ISO strings.
   * toLocaleDateString('en-PK', options) formats for Pakistan locale.
   *
   * We wrap in try/catch because if 'date' is a weird string
   * that can't be parsed, new Date() returns an Invalid Date.
   * The catch block falls back to showing the raw date value.
   */
  let formattedDate = date;
  try {
    formattedDate = new Date(date).toLocaleDateString('en-PK', {
      weekday: 'long',  // "Monday"
      year: 'numeric',  // "2024"
      month: 'long',    // "August"
      day: 'numeric'    // "15"
    });
  } catch (_) {
    formattedDate = date; // fallback: show whatever was passed in
  }

  const html = wrapEmail(
    `<h1 style="margin:0; font-size:24px;">Interview Invitation</h1>
     <p style="margin:8px 0 0; opacity:0.9;">${jobTitle}</p>`,
    `<p style="color:#202124; font-size:16px;">Dear <strong>${candidateName}</strong>,</p>
     <p style="color:#202124; line-height:1.6;">
       We are delighted to invite you to an interview for the position of
       <strong>${jobTitle}</strong>. Please find the details below:
     </p>
     <div style="${highlightBoxStyle}">
       <p style="margin:0 0 8px; color:#202124;"><strong>📅 Date:</strong> ${formattedDate}</p>
       <p style="margin:0; color:#202124;"><strong>🕐 Time:</strong> ${time}</p>
     </div>
     ${
       /*
        * Conditional rendering: only show the HR message box if a
        * message was actually provided. The ternary operator works
        * inside template literals: condition ? 'truthy' : 'falsy'
        */
       message
         ? `<div style="background:#fff8e1; border-left:4px solid #f9a825; padding:16px; margin:16px 0; border-radius:4px;">
              <p style="margin:0 0 4px; color:#f57f17; font-weight:bold;">Message from HR:</p>
              <p style="margin:0; color:#202124; line-height:1.6;">${message}</p>
            </div>`
         : '' // no message — render nothing for this section
     }
     <p style="color:#202124; line-height:1.6;">
       Please confirm your attendance by replying to this email or contacting our HR department.
       If you are unable to attend at the scheduled time, please let us know as soon as possible.
     </p>
     <p style="color:#202124;">Best regards,<br><strong>HR Team</strong><br>ATS Recruitment</p>`
  );
  return { subject, html };
};

// ── 3. Rejection Email ───────────────────────────────────────
/*
 * Sent when HR rejects a candidate's application.
 * Uses a red header (rejectionHeaderStyle) to visually distinguish
 * it from positive emails. Tone is polite and encouraging.
 *
 * Parameters:
 *   candidateName (string) — candidate's full name
 *   jobTitle      (string) — the job they applied for
 */
const rejectionEmail = (candidateName, jobTitle) => {
  const subject = `Update on Your Application — ${jobTitle}`;
  const html = wrapEmail(
    `<h1 style="margin:0; font-size:24px;">Application Update</h1>
     <p style="margin:8px 0 0; opacity:0.9;">${jobTitle}</p>`,
    `<p style="color:#202124; font-size:16px;">Dear <strong>${candidateName}</strong>,</p>
     <p style="color:#202124; line-height:1.6;">
       Thank you for taking the time to apply for the position of <strong>${jobTitle}</strong>
       and for your interest in our organization.
     </p>
     <p style="color:#202124; line-height:1.6;">
       After careful consideration, we regret to inform you that we will not be moving forward
       with your application at this time. This was a difficult decision as we received many
       strong applications.
     </p>
     <div style="${highlightBoxStyle}">
       <p style="margin:0; color:#1a73e8;">
         We encourage you to apply for future openings that match your skills and experience.
         We will keep your profile on file for consideration.
       </p>
     </div>
     <p style="color:#202124; line-height:1.6;">
       We sincerely appreciate the effort you put into your application and wish you the
       very best in your job search.
     </p>
     <p style="color:#202124;">Best regards,<br><strong>HR Team</strong><br>ATS Recruitment</p>`,
    rejectionHeaderStyle // use the red header instead of the default blue one
  );
  return { subject, html };
};

// ── 4. Custom Email ──────────────────────────────────────────
/*
 * Allows HR to send any free-form message to a candidate.
 * The 'message' parameter is the custom text written by HR
 * in the frontend form. It's injected into the email body.
 *
 * Parameters:
 *   candidateName (string) — candidate's full name
 *   message       (string) — the custom message text from HR
 */
const customEmail = (candidateName, message) => {
  const subject = 'Message from HR — ATS Recruitment';
  const html = wrapEmail(
    `<h1 style="margin:0; font-size:24px;">Message from HR</h1>
     <p style="margin:8px 0 0; opacity:0.9;">ATS Recruitment Team</p>`,
    `<p style="color:#202124; font-size:16px;">Dear <strong>${candidateName}</strong>,</p>
     <div style="color:#202124; line-height:1.8; font-size:15px;">
       ${message}
     </div>
     <p style="color:#202124; margin-top:24px;">Best regards,<br><strong>HR Team</strong><br>ATS Recruitment</p>`
  );
  return { subject, html };
};

// ── Export ───────────────────────────────────────────────────
/*
 * Export everything routes/hr.js needs.
 * Named exports (object syntax) let the importer pick what it needs:
 *   const { sendEmail, shortlistEmail } = require('../utils/email')
 */
module.exports = {
  sendEmail,        // core sending function
  shortlistEmail,   // shortlist notification template
  interviewEmail,   // interview invitation template
  rejectionEmail,   // rejection notice template
  customEmail       // free-form HR message template
};
