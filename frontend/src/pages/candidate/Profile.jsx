import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { InlineLoader } from '../../components/Loader';

const DEGREE_OPTIONS = [
  "Matric / O-Levels",
  "Intermediate / A-Levels",
  "Bachelor's",
  "Master's",
  "MBA",
  "PhD",
  "Diploma",
  "Certificate",
  "Other",
];

const JOB_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Remote', 'Contract', 'Internship', 'Freelance'];
const DEPARTMENT_OPTIONS = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations', 'Product', 'Data Science', 'Customer Support'];
const LOCATION_OPTIONS = ['Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Peshawar', 'Quetta', 'Remote'];

function getCompletion(user) {
  const checks = [
    { label: 'Phone number', done: !!user?.phone },
    { label: 'Profile picture', done: !!user?.profilePicture },
    { label: 'CV / Resume (Required)', done: !!user?.resumeUrl },
    { label: 'Education history', done: (user?.education?.length || 0) > 0 },
    { label: 'Skills added', done: (user?.skills?.length || 0) > 0 },
    { label: 'Job preferences', done: (user?.jobPreferences?.jobTypes?.length || 0) > 0 },
  ];
  const done = checks.filter(c => c.done).length;
  return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
}

const EMPTY_EDU = {
  degree: '',
  institution: '',
  fieldOfStudy: '',
  startYear: '',
  endYear: '',
  grade: '',
  current: false,
};

const CandidateProfile = () => {
  const { user, updateUser } = useAuth();

  // ── Personal Info ──────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // ── Education ──────────────────────────────────────────────
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEduIdx, setEditingEduIdx] = useState(null);
  const [eduForm, setEduForm] = useState(EMPTY_EDU);
  const [savingEdu, setSavingEdu] = useState(false);
  const [eduMsg, setEduMsg] = useState({ type: '', text: '' });

  // ── Skills ─────────────────────────────────────────────────
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState(user?.skills || []);
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillsMsg, setSkillsMsg] = useState({ type: '', text: '' });

  // ── Job Preferences ────────────────────────────────────────
  const [prefs, setPrefs] = useState({
    jobTypes: user?.jobPreferences?.jobTypes || [],
    preferredDepartments: user?.jobPreferences?.preferredDepartments || [],
    preferredLocations: user?.jobPreferences?.preferredLocations || [],
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState({ type: '', text: '' });

  // ── Documents ──────────────────────────────────────────────
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingCoverLetter, setUploadingCoverLetter] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [resumeMsg, setResumeMsg] = useState({ type: '', text: '' });
  const [coverLetterMsg, setCoverLetterMsg] = useState({ type: '', text: '' });
  const [picMsg, setPicMsg] = useState({ type: '', text: '' });
  const [picPreview, setPicPreview] = useState(user?.profilePicture || null);

  const resumeInputRef = useRef();
  const coverLetterInputRef = useRef();
  const picInputRef = useRef();

  useEffect(() => {
    if (user?.profilePicture) setPicPreview(user.profilePicture);
  }, [user?.profilePicture]);

  // Sync skills/prefs if user changes from outside
  useEffect(() => {
    setSkills(user?.skills || []);
  }, [user?.skills]);

  useEffect(() => {
    setPrefs({
      jobTypes: user?.jobPreferences?.jobTypes || [],
      preferredDepartments: user?.jobPreferences?.preferredDepartments || [],
      preferredLocations: user?.jobPreferences?.preferredLocations || [],
    });
  }, [user?.jobPreferences]);

  const { checks, done, total, pct } = getCompletion(user);

  // ── Personal Info ──────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    if (!formData.name.trim()) {
      setProfileMsg({ type: 'error', text: 'Name is required.' });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.put('/api/auth/profile', {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      });
      if (res.data.success) {
        updateUser(res.data.data);
        setProfileMsg({ type: 'success', text: 'Profile saved successfully!' });
      } else {
        setProfileMsg({ type: 'error', text: res.data.message || 'Failed to save.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Education ──────────────────────────────────────────────
  const openAddEdu = () => {
    setEduForm(EMPTY_EDU);
    setEditingEduIdx(null);
    setEduMsg({ type: '', text: '' });
    setShowEduModal(true);
  };

  const openEditEdu = (idx) => {
    const edu = user.education[idx];
    setEduForm({
      degree: edu.degree || '',
      institution: edu.institution || '',
      fieldOfStudy: edu.fieldOfStudy || '',
      startYear: edu.startYear || '',
      endYear: edu.endYear || '',
      grade: edu.grade || '',
      current: edu.current || false,
    });
    setEditingEduIdx(idx);
    setEduMsg({ type: '', text: '' });
    setShowEduModal(true);
  };

  const handleEduChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEduForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveEdu = async () => {
    if (!eduForm.degree || !eduForm.institution) {
      setEduMsg({ type: 'error', text: 'Degree and institution are required.' });
      return;
    }
    setSavingEdu(true);
    setEduMsg({ type: '', text: '' });
    const updatedEdu = [...(user?.education || [])];
    const entry = {
      degree: eduForm.degree,
      institution: eduForm.institution,
      fieldOfStudy: eduForm.fieldOfStudy,
      startYear: eduForm.startYear ? Number(eduForm.startYear) : undefined,
      endYear: eduForm.current ? undefined : (eduForm.endYear ? Number(eduForm.endYear) : undefined),
      grade: eduForm.grade,
      current: eduForm.current,
    };
    if (editingEduIdx !== null) {
      updatedEdu[editingEduIdx] = entry;
    } else {
      updatedEdu.push(entry);
    }
    try {
      const res = await api.put('/api/auth/profile', { education: updatedEdu });
      if (res.data.success) {
        updateUser(res.data.data);
        setShowEduModal(false);
      } else {
        setEduMsg({ type: 'error', text: res.data.message || 'Failed to save.' });
      }
    } catch (err) {
      setEduMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally {
      setSavingEdu(false);
    }
  };

  const handleDeleteEdu = async (idx) => {
    const updatedEdu = (user?.education || []).filter((_, i) => i !== idx);
    try {
      const res = await api.put('/api/auth/profile', { education: updatedEdu });
      if (res.data.success) updateUser(res.data.data);
    } catch {}
  };

  // ── Skills ─────────────────────────────────────────────────
  const addSkill = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim().replace(/,$/, '');
      if (val && !skills.includes(val)) {
        setSkills(prev => [...prev, val]);
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => setSkills(prev => prev.filter(s => s !== skill));

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    setSkillsMsg({ type: '', text: '' });
    try {
      const res = await api.put('/api/auth/profile', { skills });
      if (res.data.success) {
        updateUser(res.data.data);
        setSkillsMsg({ type: 'success', text: 'Skills saved!' });
      } else {
        setSkillsMsg({ type: 'error', text: res.data.message || 'Failed to save.' });
      }
    } catch (err) {
      setSkillsMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally {
      setSavingSkills(false);
    }
  };

  // ── Job Preferences ────────────────────────────────────────
  const togglePref = (field, val) => {
    setPrefs(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    setPrefsMsg({ type: '', text: '' });
    try {
      const res = await api.put('/api/auth/profile', { jobPreferences: prefs });
      if (res.data.success) {
        updateUser(res.data.data);
        setPrefsMsg({ type: 'success', text: 'Preferences saved!' });
      } else {
        setPrefsMsg({ type: 'error', text: res.data.message || 'Failed to save.' });
      }
    } catch (err) {
      setPrefsMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── File Uploads ───────────────────────────────────────────
  const handlePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPicPreview(URL.createObjectURL(file));
    setPicMsg({ type: '', text: '' });
    const fd = new FormData();
    fd.append('profilePic', file);
    setUploadingPic(true);
    try {
      const res = await api.post('/api/auth/upload/profile-pic', fd);
      if (res.data.success) {
        updateUser(res.data.data.user);
        setPicMsg({ type: 'success', text: 'Profile picture updated!' });
      } else {
        setPicMsg({ type: 'error', text: 'Upload failed.' });
      }
    } catch (err) {
      setPicMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally {
      setUploadingPic(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setResumeMsg({ type: 'error', text: 'Please select a PDF file.' });
      return;
    }
    setResumeMsg({ type: '', text: '' });
    const fd = new FormData();
    fd.append('resume', file);
    setUploadingResume(true);
    try {
      const res = await api.post('/api/auth/upload/resume', fd);
      if (res.data.success) {
        updateUser(res.data.data.user);
        setResumeMsg({ type: 'success', text: 'CV uploaded successfully!' });
      } else {
        setResumeMsg({ type: 'error', text: 'Upload failed.' });
      }
    } catch (err) {
      setResumeMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally {
      setUploadingResume(false);
    }
  };

  const handleCoverLetterUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setCoverLetterMsg({ type: 'error', text: 'Please select a PDF file.' });
      return;
    }
    setCoverLetterMsg({ type: '', text: '' });
    const fd = new FormData();
    fd.append('coverLetter', file);
    setUploadingCoverLetter(true);
    try {
      const res = await api.post('/api/auth/upload/cover-letter', fd);
      if (res.data.success) {
        updateUser(res.data.data.user);
        setCoverLetterMsg({ type: 'success', text: 'Cover letter uploaded successfully!' });
      } else {
        setCoverLetterMsg({ type: 'error', text: 'Upload failed.' });
      }
    } catch (err) {
      setCoverLetterMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally {
      setUploadingCoverLetter(false);
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="page-header">
        <div className="container">
          <h1>My Profile</h1>
          <p>Complete your profile to increase your chances of getting hired</p>
        </div>
      </div>

      <div className="container">

        {/* ── Profile Completion Banner ───────────────────────── */}
        {pct < 100 ? (
          <div style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
            border: '1px solid #fbbf24',
            borderRadius: 'var(--radius)',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
          }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '6px', fontSize: '15px' }}>
                Your profile is {pct}% complete
              </div>
              <div style={{ fontSize: '13px', color: '#78350f', marginBottom: '12px' }}>
                Complete your profile to stand out to recruiters. Missing sections:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {checks.filter(c => !c.done).map(c => (
                  <span key={c.label} style={{
                    background: '#fef3c7', border: '1px solid #fbbf24',
                    borderRadius: '20px', padding: '3px 10px',
                    fontSize: '12px', color: '#92400e', fontWeight: '600',
                  }}>
                    {c.label}
                  </span>
                ))}
              </div>
              <div style={{ height: '6px', background: '#fde68a', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                  borderRadius: '3px', transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ fontSize: '11px', color: '#78350f', marginTop: '4px' }}>
                {done} of {total} sections completed
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #86efac',
            borderRadius: 'var(--radius)',
            padding: '16px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '22px' }}>✅</span>
            <div style={{ fontWeight: '700', color: '#166534', fontSize: '14px' }}>
              Your profile is 100% complete — great job! Your profile is ready for recruiters.
            </div>
          </div>
        )}

        {/* ── Two-Column Layout ───────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '24px',
          alignItems: 'start',
        }}>

          {/* ── LEFT COLUMN ──────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Profile Picture Card */}
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>Profile Picture</h3>

              <div
                onClick={() => picInputRef.current.click()}
                style={{
                  width: '120px', height: '120px', borderRadius: '50%',
                  overflow: 'hidden', margin: '0 auto 16px', cursor: 'pointer',
                  border: '3px solid var(--primary)', position: 'relative',
                  background: 'var(--primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {picPreview ? (
                  <img src={picPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '42px', fontWeight: '800', color: 'var(--primary)' }}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.2s', fontSize: '24px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
                >
                  📷
                </div>
              </div>

              <input ref={picInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePicUpload} />

              <button
                className="btn btn-outline btn-sm"
                onClick={() => picInputRef.current.click()}
                disabled={uploadingPic}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {uploadingPic ? <><InlineLoader /> Uploading...</> : '📷 Change Photo'}
              </button>

              {picMsg.text && (
                <div className={`alert alert-${picMsg.type}`} style={{ marginTop: '10px', fontSize: '13px' }}>
                  {picMsg.text}
                </div>
              )}

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', textAlign: 'left' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Email</div>
                <div style={{ fontSize: '13px', fontWeight: '500', wordBreak: 'break-all' }}>{user?.email}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', marginBottom: '4px' }}>Role</div>
                <span className="badge badge-submitted">Job Seeker</span>
              </div>
            </div>

            {/* Profile Strength Card */}
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>Profile Strength</h3>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '8px' }}>
                  <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle
                      cx="40" cy="40" r="32" fill="none"
                      stroke={pct === 100 ? '#22c55e' : pct >= 60 ? 'var(--primary)' : '#f59e0b'}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: '800',
                    color: pct === 100 ? '#22c55e' : pct >= 60 ? 'var(--primary)' : '#f59e0b',
                  }}>
                    {pct}%
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {pct === 100 ? 'Complete!' : pct >= 60 ? 'Good progress' : 'Needs attention'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {checks.map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <span style={{ fontSize: '15px', color: c.done ? '#22c55e' : '#d1d5db', flexShrink: 0 }}>
                      {c.done ? '✓' : '○'}
                    </span>
                    <span style={{ color: c.done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: c.done ? '600' : '400' }}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Personal Information */}
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '18px' }}>Personal Information</h3>
              {profileMsg.text && <div className={`alert alert-${profileMsg.type}`}>{profileMsg.text}</div>}
              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Full Name *</label>
                    <input name="name" type="text" className="form-input" value={formData.name} onChange={handleChange} placeholder="Your full name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Email Address
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>(cannot be changed)</span>
                    </label>
                    <input type="email" className="form-input" value={user?.email || ''} readOnly style={{ background: 'var(--bg)', cursor: 'not-allowed', color: 'var(--text-muted)' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input name="phone" type="tel" className="form-input" value={formData.phone} onChange={handleChange} placeholder="+92 300 0000000" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Address</label>
                    <textarea name="address" className="form-textarea" value={formData.address} onChange={handleChange} placeholder="Your address" rows={2} style={{ resize: 'none' }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? <><InlineLoader /> Saving...</> : '💾 Save Profile'}
                </button>
              </form>
            </div>

            {/* Education */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: '700', fontSize: '18px', margin: 0 }}>Education</h3>
                <button className="btn btn-outline btn-sm" onClick={openAddEdu}>+ Add Education</button>
              </div>

              {(!user?.education || user.education.length === 0) ? (
                <div style={{
                  textAlign: 'center', padding: '24px',
                  color: 'var(--text-muted)', fontSize: '14px',
                  background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border)',
                }}>
                  No education added yet. Click "+ Add Education" to get started.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {user.education.map((edu, idx) => (
                    <div key={idx} style={{
                      padding: '16px', background: 'var(--bg)',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
                    }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>{edu.degree}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{edu.institution}</div>
                        {edu.fieldOfStudy && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{edu.fieldOfStudy}</div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {edu.startYear && (
                            <span>{edu.startYear}{edu.current ? ' – Present' : edu.endYear ? ` – ${edu.endYear}` : ''}</span>
                          )}
                          {edu.grade && <span style={{ fontWeight: '600' }}>GPA: {edu.grade}</span>}
                          {edu.current && (
                            <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: '600' }}>
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEditEdu(idx)} style={{ padding: '4px 10px', fontSize: '12px' }}>Edit</button>
                        <button className="btn btn-sm" onClick={() => handleDeleteEdu(idx)} style={{ padding: '4px 10px', fontSize: '12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills & Interests */}
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '6px', fontSize: '18px' }}>Skills & Interests</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Press Enter or comma to add a skill. Click × to remove.
              </p>

              <div
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: '8px',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'white', minHeight: '52px', cursor: 'text',
                }}
                onClick={() => document.getElementById('skill-input').focus()}
              >
                {skills.map(s => (
                  <span key={s} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    borderRadius: '20px', padding: '3px 10px',
                    fontSize: '13px', fontWeight: '600',
                  }}>
                    {s}
                    <button
                      onClick={() => removeSkill(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: '700', fontSize: '14px', padding: '0', lineHeight: 1 }}
                    >×</button>
                  </span>
                ))}
                <input
                  id="skill-input"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={addSkill}
                  placeholder={skills.length === 0 ? 'e.g. React, Python, Communication...' : ''}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', minWidth: '150px', flex: 1 }}
                />
              </div>

              {skillsMsg.text && (
                <div className={`alert alert-${skillsMsg.type}`} style={{ marginTop: '10px', fontSize: '13px' }}>
                  {skillsMsg.text}
                </div>
              )}

              <button className="btn btn-primary" onClick={handleSaveSkills} disabled={savingSkills} style={{ marginTop: '12px' }}>
                {savingSkills ? <><InlineLoader /> Saving...</> : '💾 Save Skills'}
              </button>
            </div>

            {/* Job Preferences */}
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '18px' }}>Job Preferences</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job Types</div>
                  {JOB_TYPE_OPTIONS.map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={prefs.jobTypes.includes(opt)} onChange={() => togglePref('jobTypes', opt)} />
                      {opt}
                    </label>
                  ))}
                </div>

                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Departments</div>
                  {DEPARTMENT_OPTIONS.map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={prefs.preferredDepartments.includes(opt)} onChange={() => togglePref('preferredDepartments', opt)} />
                      {opt}
                    </label>
                  ))}
                </div>

                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Locations</div>
                  {LOCATION_OPTIONS.map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={prefs.preferredLocations.includes(opt)} onChange={() => togglePref('preferredLocations', opt)} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              {prefsMsg.text && (
                <div className={`alert alert-${prefsMsg.type}`} style={{ marginTop: '10px', fontSize: '13px' }}>
                  {prefsMsg.text}
                </div>
              )}

              <button className="btn btn-primary" onClick={handleSavePrefs} disabled={savingPrefs} style={{ marginTop: '16px' }}>
                {savingPrefs ? <><InlineLoader /> Saving...</> : '💾 Save Preferences'}
              </button>
            </div>

            {/* Documents */}
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '18px' }}>Documents</h3>

              {/* CV / Resume — REQUIRED */}
              <div style={{
                padding: '20px',
                background: user?.resumeUrl ? '#f0fdf4' : '#fff7ed',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${user?.resumeUrl ? '#86efac' : '#fbbf24'}`,
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>{user?.resumeUrl ? '📄' : '⚠️'}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>CV / Resume</span>
                        <span style={{ background: '#dc2626', color: 'white', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>
                          REQUIRED
                        </span>
                      </div>
                      {user?.resumeUrl ? (
                        <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>
                          View current CV ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#92400e', fontWeight: '600' }}>
                          CV is compulsory before applying for any job
                        </span>
                      )}
                    </div>
                  </div>
                  <input ref={resumeInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleResumeUpload} />
                  <button className="btn btn-outline btn-sm" onClick={() => resumeInputRef.current.click()} disabled={uploadingResume}>
                    {uploadingResume ? <><InlineLoader /> Uploading...</> : user?.resumeUrl ? '📤 Update CV' : '📤 Upload CV'}
                  </button>
                </div>
                {resumeMsg.text && (
                  <div className={`alert alert-${resumeMsg.type}`} style={{ marginTop: '10px', fontSize: '13px' }}>{resumeMsg.text}</div>
                )}
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: 0 }}>PDF format only · Max 5MB</p>
              </div>

              {/* Cover Letter — Optional */}
              <div style={{
                padding: '20px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>📝</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>Cover Letter</span>
                        <span style={{ background: '#e5e7eb', color: '#374151', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: '700' }}>
                          OPTIONAL
                        </span>
                      </div>
                      {user?.coverLetterUrl ? (
                        <a href={user.coverLetterUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
                          View current cover letter ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          Not uploaded — optional but recommended
                        </span>
                      )}
                    </div>
                  </div>
                  <input ref={coverLetterInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleCoverLetterUpload} />
                  <button className="btn btn-outline btn-sm" onClick={() => coverLetterInputRef.current.click()} disabled={uploadingCoverLetter}>
                    {uploadingCoverLetter ? <><InlineLoader /> Uploading...</> : user?.coverLetterUrl ? '📤 Update Cover Letter' : '📤 Upload Cover Letter'}
                  </button>
                </div>
                {coverLetterMsg.text && (
                  <div className={`alert alert-${coverLetterMsg.type}`} style={{ marginTop: '10px', fontSize: '13px' }}>{coverLetterMsg.text}</div>
                )}
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: 0 }}>PDF format only · Optional but recommended</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Education Modal ────────────────────────────────────── */}
      {showEduModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowEduModal(false); }}
        >
          <div style={{
            background: 'white', borderRadius: 'var(--radius)',
            padding: '28px', width: '100%', maxWidth: '520px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '18px' }}>
              {editingEduIdx !== null ? 'Edit Education' : 'Add Education'}
            </h3>

            {eduMsg.text && <div className={`alert alert-${eduMsg.type}`}>{eduMsg.text}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Degree *</label>
                <select name="degree" className="form-input" value={eduForm.degree} onChange={handleEduChange}>
                  <option value="">Select degree</option>
                  {DEGREE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Institution *</label>
                <input name="institution" type="text" className="form-input" value={eduForm.institution} onChange={handleEduChange} placeholder="University / College / School" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Field of Study</label>
                <input name="fieldOfStudy" type="text" className="form-input" value={eduForm.fieldOfStudy} onChange={handleEduChange} placeholder="e.g. Computer Science, Business Administration" />
              </div>

              <div className="form-group">
                <label className="form-label">Start Year</label>
                <input name="startYear" type="number" className="form-input" value={eduForm.startYear} onChange={handleEduChange} placeholder="e.g. 2020" min="1950" max="2030" />
              </div>

              <div className="form-group">
                <label className="form-label">
                  End Year
                  {eduForm.current && <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '4px' }}>(currently enrolled)</span>}
                </label>
                <input
                  name="endYear" type="number" className="form-input"
                  value={eduForm.current ? '' : eduForm.endYear}
                  onChange={handleEduChange}
                  placeholder="e.g. 2024"
                  min="1950" max="2035"
                  disabled={eduForm.current}
                  style={eduForm.current ? { opacity: 0.5 } : {}}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input type="checkbox" name="current" checked={eduForm.current} onChange={handleEduChange} />
                  Currently studying here
                </label>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">GPA / Grade</label>
                <input name="grade" type="text" className="form-input" value={eduForm.grade} onChange={handleEduChange} placeholder="e.g. 3.8/4.0 or A+" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowEduModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdu} disabled={savingEdu}>
                {savingEdu ? <><InlineLoader /> Saving...</> : editingEduIdx !== null ? 'Update' : 'Add Education'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 300px 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: 1fr 1fr 1fr"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: 1fr 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CandidateProfile;
