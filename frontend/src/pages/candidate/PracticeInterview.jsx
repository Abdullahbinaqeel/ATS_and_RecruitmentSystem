/*
 * ============================================================
 * pages/candidate/PracticeInterview.jsx — Candidate AI Practice Page
 * ============================================================
 * WHAT THIS FILE DOES:
 *   Provides an interactive chat mock interview experience.
 *   - Intro Screen: explains mock parameters and links.
 *   - Chat Screen: sends responses to backend and displays AI feedback.
 *   - Completed Screen: displays score and markdown breakdown.
 * ============================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { SectionLoader, InlineLoader } from '../../components/Loader';

// ── Native Markdown Formatter ────────────────────────────────
const parseBoldText = (text) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{part}</strong>;
    }
    return part;
  });
};

const renderMarkdown = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, index) => {
    if (line.startsWith('### ')) {
      return (
        <h3 key={index} style={{
          fontSize: '17px', fontWeight: '700',
          color: 'var(--text-primary)', marginTop: '20px',
          marginBottom: '8px', borderBottom: '1px solid var(--border)',
          paddingBottom: '4px'
        }}>
          {line.replace('### ', '')}
        </h3>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={index} style={{
          fontSize: '19px', fontWeight: '700',
          color: 'var(--text-primary)', marginTop: '24px',
          marginBottom: '10px', borderBottom: '1px solid var(--border)',
          paddingBottom: '6px'
        }}>
          {line.replace('## ', '')}
        </h2>
      );
    }
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const cleaned = line.trim().substring(2);
      return (
        <li key={index} style={{
          marginLeft: '20px', marginBottom: '6px',
          color: 'var(--text-secondary)', fontSize: '14.5px',
          lineHeight: '1.6'
        }}>
          {parseBoldText(cleaned)}
        </li>
      );
    }
    if (line.trim() === '') {
      return <div key={index} style={{ height: '8px' }} />;
    }
    return (
      <p key={index} style={{
        color: 'var(--text-secondary)', fontSize: '14.5px',
        lineHeight: '1.6', marginBottom: '12px'
      }}>
        {parseBoldText(line)}
      </p>
    );
  });
};

// ============================================================
// PracticeInterview — Main Page Component
// ============================================================
const PracticeInterview = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [metadata, setMetadata] = useState(null); // stores application/job metadata if session not started
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [userMessage, setUserMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);

  const messagesEndRef = useRef(null);

  // Fetch session status on mount
  useEffect(() => {
    fetchSession();
  }, [applicationId]);

  // Auto-scroll to latest message in chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, sending]);

  const fetchSession = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/practice-interviews/application/${applicationId}`);
      if (res.data.success) {
        if (res.data.data) {
          setSession(res.data.data);
        } else {
          // No session yet: save metadata containing job details
          setSession(null);
          setMetadata(res.data.application);
        }
      }
    } catch (err) {
      console.error('Fetch session error:', err);
      setError(err.response?.data?.message || 'Failed to load practice interview session.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/practice-interviews/start', { applicationId });
      if (res.data.success) {
        setSession(res.data.data);
      }
    } catch (err) {
      console.error('Start session error:', err);
      setError(err.response?.data?.message || 'Failed to initialize the practice session.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userMessage.trim() || sending) return;

    const messageToSend = userMessage.trim();
    setUserMessage('');
    setSending(true);

    // Optimistically update local message log first (User message)
    const optimisticMsg = {
      role: 'user',
      parts: [{ text: messageToSend }],
      timestamp: new Date().toISOString()
    };
    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, optimisticMsg]
    }));

    try {
      const res = await api.post(`/api/practice-interviews/${session._id}/message`, { message: messageToSend });
      if (res.data.success) {
        setSession(res.data.data);
      }
    } catch (err) {
      console.error('Send message error:', err);
      setError('Connection interrupted. Please resend your answer.');
      // Remove the optimistic message on failure
      setSession(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg !== optimisticMsg)
      }));
    } finally {
      setSending(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Conclude the interview and analyze your responses? This will generate your feedback dashboard.')) {
      return;
    }

    setCompleting(true);
    try {
      const res = await api.post(`/api/practice-interviews/${session._id}/complete`);
      if (res.data.success) {
        setSession(res.data.data);
      }
    } catch (err) {
      console.error('Complete session error:', err);
      alert(err.response?.data?.message || 'Failed to complete interview and generate feedback.');
    } finally {
      setCompleting(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Delete this practice session and start a new one? Your current chat log and feedback score will be permanently cleared.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.delete(`/api/practice-interviews/${session._id}`);
      if (res.data.success) {
        setSession(null);
        fetchSession();
      }
    } catch (err) {
      console.error('Reset session error:', err);
      alert('Failed to reset the practice session.');
      setLoading(false);
    }
  };

  // Helper values
  const jobTitle = session?.job?.title || metadata?.job?.title || 'Job Role';
  const jobDept = session?.job?.department || metadata?.job?.department || '';
  const messageCount = session?.messages?.filter(m => m.role === 'user').length || 0;

  if (loading) {
    return <SectionLoader message="Syncing with AI coach..." />;
  }

  return (
    <div style={{ padding: '24px 0 60px 0', minHeight: 'calc(100vh - 120px)' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/dashboard" style={{
            fontSize: '14px', fontWeight: '600', color: 'var(--primary)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            ← Back to Dashboard
          </Link>
          {session && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Session ID: {session._id.substring(0, 8)}...
            </span>
          )}
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
          </div>
        )}

        {/* ── CASE 1: Intro Screen (Start State) ───────────────── */}
        {!session && (
          <div className="card" style={{ padding: '40px', textAlign: 'center', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🤖</div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Practice AI Interview
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '600px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
              Conduct a simulated technical and behavioral chat interview to practice your skills! 
              The questions will be tailored dynamically based on the job posting requirements and the profile details (skills and education) you provided.
            </p>

            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px', maxWidth: '600px',
              margin: '0 auto 32px auto', textAlign: 'left'
            }}>
              <h4 style={{ fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)', fontSize: '15px' }}>
                Practice Parameters:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <strong>Target Role:</strong> {jobTitle} ({jobDept})
                </li>
                <li style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <strong>Structure:</strong> A 5-question conversational thread.
                </li>
                <li style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <strong>Outcome:</strong> Real-time detailed review covering key strengths, areas to improve, and a mock score.
                </li>
              </ul>
            </div>

            <button onClick={handleStart} className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '16px', fontWeight: '700' }}>
              Start Mock Interview
            </button>
          </div>
        )}

        {/* ── CASE 2: Active Chat Screen (In-Progress State) ────── */}
        {session && session.status !== 'completed' && (
          <div className="card" style={{
            display: 'flex', flexDirection: 'column', height: '620px',
            padding: 0, overflow: 'hidden', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Chat Header */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--surface)'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Interviewer: AI Coach
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Mocking for: <strong>{jobTitle}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span className="badge badge-under_review" style={{ margin: 0 }}>
                  Q: {messageCount}/5 Answered
                </span>
                <button
                  onClick={handleComplete}
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  disabled={completing}
                >
                  {completing ? <><InlineLoader /> Analyzing...</> : 'Conclude & Feedback'}
                </button>
              </div>
            </div>

            {/* Messages Thread Container */}
            <div style={{
              flex: 1, padding: '24px', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: '16px',
              background: 'var(--bg)'
            }}>
              {session.messages.map((msg, i) => {
                const isAI = msg.role === 'model';
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignSelf: isAI ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    gap: '12px',
                    flexDirection: isAI ? 'row' : 'row-reverse'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: isAI ? 'var(--primary-light)' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', flexShrink: 0
                    }}>
                      {isAI ? '🤖' : '👤'}
                    </div>

                    {/* Chat Bubble */}
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      borderTopLeftRadius: isAI ? '0' : '12px',
                      borderTopRightRadius: isAI ? '12px' : '0',
                      background: isAI ? 'var(--surface)' : 'var(--primary)',
                      color: isAI ? 'var(--text-primary)' : '#ffffff',
                      border: isAI ? '1px solid var(--border)' : 'none',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                      fontSize: '14.5px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.parts?.[0]?.text || ''}
                    </div>
                  </div>
                );
              })}

              {/* Pulsating Typing Indicator */}
              {sending && (
                <div style={{ display: 'flex', alignSelf: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    🤖
                  </div>
                  <div style={{
                    padding: '12px 20px', borderRadius: '12px', borderTopLeftRadius: 0,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic',
                    animation: 'pulse 1.5s infinite'
                  }}>
                    AI Interviewer is writing a response...
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Form */}
            <form onSubmit={handleSendMessage} style={{
              padding: '16px 24px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: '12px', background: 'var(--surface)',
              alignItems: 'center'
            }}>
              <textarea
                value={userMessage}
                onChange={e => setUserMessage(e.target.value)}
                placeholder={sending ? "AI is thinking..." : "Type your detailed answer here..."}
                disabled={sending}
                rows={2}
                style={{
                  flex: 1, resize: 'none', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '10px 14px', fontSize: '14.5px',
                  background: 'var(--bg)', color: 'var(--text-primary)',
                  fontFamily: 'inherit', outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={sending || !userMessage.trim()}
                className="btn btn-primary"
                style={{ padding: '0 24px', height: '46px', fontWeight: '700' }}
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* ── CASE 3: Feedback Dashboard (Completed State) ──────── */}
        {session && session.status === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top Score summary header */}
            <div className="card" style={{
              padding: '30px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px',
              background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.04)'
            }}>
              <div>
                <span className="badge badge-selected" style={{ marginBottom: '8px' }}>
                  Practice Complete
                </span>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  Practice Performance Evaluation
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
                  Mock interview feedback for the <strong>{jobTitle}</strong> position.
                </p>
              </div>

              {/* Large Glow Score */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', background: 'var(--surface)',
                border: '4px solid var(--success)', borderRadius: '50%',
                width: '110px', height: '110px', boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)'
              }}>
                <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--success)' }}>
                  {session.score || 'N/A'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '-2px' }}>
                  SCORE / 100
                </span>
              </div>
            </div>

            {/* Layout Split: Left (Feedback) / Right (Transcript Review) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
              
              {/* Feedback Breakdown */}
              <div className="card" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                    AI Coach Analysis
                  </h3>
                  <button onClick={handleReset} className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    ↻ Practice Again
                  </button>
                </div>

                <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {renderMarkdown(session.feedback)}
                </div>
              </div>

              {/* Full Chat Transcript for Self-Correction */}
              <div className="card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>
                  Transcript Review
                </h3>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
                  {session.messages.map((msg, i) => {
                    const isAI = msg.role === 'model';
                    return (
                      <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px' }}>{isAI ? '🤖' : '👤'}</span>
                          <strong style={{ fontSize: '12.5px', color: isAI ? 'var(--primary)' : 'var(--text-secondary)' }}>
                            {isAI ? 'AI Coach' : 'You'}
                          </strong>
                        </div>
                        <p style={{
                          fontSize: '13.5px', color: 'var(--text-secondary)',
                          lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap'
                        }}>
                          {msg.parts?.[0]?.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
      
      {/* CSS keyframe pulse inject directly */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default PracticeInterview;
