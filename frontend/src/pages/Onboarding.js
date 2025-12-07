import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../context/LocaleContext';
import '../styles/Onboarding.css';

// --------------------- UTILS ---------------------
const checkPasswordStrength = (password) => {
  if (!password) return { strength: 'none', score: 0, feedback: [], isValid: false };

  const feedback = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('At least 8 characters');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('One lowercase letter');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('One uppercase letter');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('One number');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('One special character');

  let strength = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return { strength, score, feedback, isValid: score >= 3 };
};

const calculateMoodScore = (emotionalScan) => {
  if (!emotionalScan || Object.keys(emotionalScan).length === 0) return 5;
  const feelingAnswer = emotionalScan[1];
  if (!feelingAnswer) return 5;

  const feelingMap = {
    '😢 Struggling': 2,
    '😐 Okay': 5,
    '🙂 Good': 7,
    '😄 Great': 9
  };

  for (const [key, value] of Object.entries(feelingMap)) {
    if (feelingAnswer.includes(key)) return value;
  }

  const answer = feelingAnswer.toLowerCase();
  if (answer.includes('struggling') || answer.includes('sad')) return 2;
  if (answer.includes('okay') || answer.includes('neutral')) return 5;
  if (answer.includes('good') || answer.includes('happy')) return 7;
  if (answer.includes('great') || answer.includes('excellent')) return 9;

  return 5;
};

// --------------------- COMPONENTS ---------------------
const StepWrapper = ({ title, description, children }) => (
  <div className="onboarding-step fade-in">
    <h2>{title}</h2>
    {description && <p className="step-description">{description}</p>}
    {children}
  </div>
);

const WelcomeStep = ({ onNext, formData, updateFormData }) => {
  const { languages, updateLanguage } = useLocale();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const handleLanguageSelect = (langCode) => {
    updateFormData('language', langCode);
    updateLanguage(langCode);
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const currentLanguage = languages[formData.language] || languages.en;

  return (
    <StepWrapper title="Welcome to NexaNova" description="Your Private Healing Space">
      <div className="logo-animation">🌱</div>
      <p className="description">
        Transform your mind, habits, and finances with AI-powered guidance. Built for African youth, designed for growth.
      </p>
      
      {/* Language Selection Dropdown */}
      <div className="form-group" style={{ marginTop: '2rem', marginBottom: '1.5rem', position: 'relative' }}>
        <label style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'block', textAlign: 'center' }}>
          Choose Your Language / Chagua Lugha Yako
        </label>
        <div ref={dropdownRef} style={{ position: 'relative', maxWidth: '400px', margin: '0 auto' }}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              transition: 'all 0.2s ease',
              fontSize: '1rem',
              fontWeight: 500
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#14b8a6'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{currentLanguage.flag}</span>
              <span>{currentLanguage.nativeName}</span>
            </div>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {isDropdownOpen ? '▲' : '▼'}
            </span>
          </button>

          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.5rem',
                background: '#fff',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              {Object.entries(languages).map(([code, lang]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleLanguageSelect(code)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.5rem',
                    border: 'none',
                    background: formData.language === code ? '#f0fdfa' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.2s ease',
                    fontSize: '0.9375rem',
                    textAlign: 'left',
                    borderBottom: '1px solid #f3f4f6'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.language !== code) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.language !== code) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{lang.flag}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: formData.language === code ? 600 : 400 }}>
                        {lang.nativeName}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {lang.name}
                      </span>
                    </div>
                  </div>
                  {formData.language === code && (
                    <span style={{ color: '#14b8a6', fontSize: '1.25rem' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="button-group">
        <button className="btn btn-primary" onClick={onNext} disabled={!formData.language}>
          Start My Journey
        </button>
        <button className="btn btn-secondary" onClick={() => window.open('#', '_blank')}>Learn More</button>
      </div>
      <p className="login-prompt">
        Already have an account? <Link to="/login" className="login-link">Login here</Link>
      </p>
    </StepWrapper>
  );
};

const PathSelectionStep = ({ selectedPath, onSelect, onNext, formData, updateFormData }) => {
  const paths = [
    { id: 'mind_reset', title: 'Mind Reset', icon: '🧠', description: 'Heal your mind, find peace, build resilience' },
    { id: 'money_builder', title: 'Money Builder', icon: '💰', description: 'Build financial habits, save, and grow wealth' },
    { id: 'habit_transformer', title: 'Habit Transformer', icon: '✨', description: 'Break bad habits, build good ones, transform your life' },
    { id: 'all', title: 'All of the Above', icon: '🌟', description: 'Complete transformation journey' }
  ];

  return (
    <StepWrapper title="Choose Your Path" description="Select the journey that calls to you">
      <div className="path-cards">
        {paths.map(path => (
          <div key={path.id} className={`path-card ${selectedPath === path.id ? 'selected' : ''}`} onClick={() => onSelect(path.id)}>
            <div className="path-icon">{path.icon}</div>
            <h3>{path.title}</h3>
            <p>{path.description}</p>
          </div>
        ))}
      </div>
      <div className="personality-selection">
        <h3>Choose Your AI Mentor</h3>
        <div className="personality-options">
          {['wise_sage', 'coach', 'friend'].map(p => (
            <label key={p}>
              <input type="radio" name="personality" value={p} checked={formData.ai_personality === p} onChange={(e) => updateFormData('ai_personality', e.target.value)} />
              <span>{p.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            </label>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" onClick={onNext} disabled={!selectedPath || !formData.ai_personality}>Continue</button>
    </StepWrapper>
  );
};

const PrivacySetupStep = ({ formData, updateFormData, onNext }) => {
  const [passwordStrength, setPasswordStrength] = useState({ strength: 'none', score: 0, feedback: [], isValid: false });
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    updateFormData('password', password);
    setPasswordStrength(checkPasswordStrength(password));
  };

  return (
    <StepWrapper title="Privacy Setup" description="Your data, your control">
      <div className="form-group">
        <label>Stay Anonymous?</label>
        <div className="toggle-group">
          <button className={`toggle-btn ${formData.anonymous_mode ? 'active' : ''}`} onClick={() => updateFormData('anonymous_mode', true)}>Yes, Stay Anonymous</button>
          <button className={`toggle-btn ${!formData.anonymous_mode ? 'active' : ''}`} onClick={() => updateFormData('anonymous_mode', false)}>Use Nickname</button>
        </div>
        {!formData.anonymous_mode && <input type="text" placeholder="Choose a nickname" value={formData.nickname || ''} onChange={(e) => updateFormData('nickname', e.target.value)} className="input-field" />}
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" placeholder="your@email.com" value={formData.email} onChange={(e) => updateFormData('email', e.target.value)} className="input-field" />
      </div>
      <div className="form-group">
        <label>Password</label>
        <div style={{ position: 'relative' }}>
          <input type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" value={formData.password} onChange={handlePasswordChange} className="input-field" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle-btn">{showPassword ? '👁️' : '👁️‍🗨️'}</button>
        </div>
        {formData.password && (
          <div className="password-strength-indicator">
            <div className={`strength-bar ${passwordStrength.strength}`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }} />
            <ul>{passwordStrength.feedback.map((req, i) => <li key={i}>{req}</li>)}</ul>
          </div>
        )}
      </div>
      <div className="toggle-option">
        <label><input type="checkbox" checked={formData.offline_mode} onChange={(e) => updateFormData('offline_mode', e.target.checked)} />Enable Offline Mode</label>
      </div>
      <div className="toggle-option">
        <label><input type="checkbox" checked={formData.store_chat} onChange={(e) => updateFormData('store_chat', e.target.checked)} />Store Chat History</label>
      </div>
      <button className="btn btn-primary" onClick={onNext} disabled={!formData.email || !formData.password || !passwordStrength.isValid}>Continue</button>
    </StepWrapper>
  );
};

const EmotionalScanStep = ({ formData, updateFormData, onComplete, loading }) => {
  const [answers, setAnswers] = useState({});
  const questions = [
    { id: 1, question: 'How are you feeling right now?', options: ['😢 Struggling', '😐 Okay', '🙂 Good', '😄 Great'] },
    { id: 2, question: 'What area needs the most support?', options: ['Mental wellness', 'Financial stability', 'Habit building', 'All of the above'] },
    { id: 3, question: 'What motivates you?', options: ['Personal growth', 'Financial freedom', 'Better habits', 'Overall transformation'] },
    { id: 4, question: 'How do you prefer to learn?', options: ['Through reflection', 'Action steps', 'Stories & proverbs', 'All methods'] },
    { id: 5, question: 'What is your biggest challenge?', options: ['Staying consistent', 'Managing emotions', 'Financial planning', 'Breaking bad habits'] }
  ];

  const handleAnswer = (qid, ans) => setAnswers({ ...answers, [qid]: ans });
  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <StepWrapper title="Emotional Scan" description="Help us understand you better">
      {questions.map(q => (
        <div key={q.id} className="question-card">
          <h4>{q.question}</h4>
          <div className="options-grid">
            {q.options.map((opt, i) => (
              <button key={i} className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`} onClick={() => handleAnswer(q.id, opt)}>{opt}</button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn btn-primary" onClick={() => { updateFormData('emotional_scan', answers); onComplete(); }} disabled={!allAnswered || loading}>
        {loading ? 'Setting up your journey...' : 'Complete Journey Setup'}
      </button>
    </StepWrapper>
  );
};

// --------------------- MAIN ONBOARDING ---------------------
const Onboarding = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { language } = useLocale();
  const [formData, setFormData] = useState({
    email: '', password: '', nickname: '', path: '', ai_personality: '',
    anonymous_mode: false, offline_mode: true, store_chat: true, emotional_scan: {},
    language: language || 'en'
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleNext = () => setStep(step + 1);

  const handleComplete = async () => {
    setError('');
    setLoading(true);

    // ----------------- VALIDATION -----------------
    if (!formData.email || !formData.password || !formData.path || !formData.ai_personality) {
      setError('Please complete all required fields');
      setLoading(false);
      return;
    }

    const passwordCheck = checkPasswordStrength(formData.password);
    if (!passwordCheck.isValid) {
      setError('Password is too weak. Please include uppercase, lowercase, numbers, and special characters.');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email address');
      setLoading(false);
      return;
    }

    if (!formData.anonymous_mode && (!formData.nickname || formData.nickname.trim() === '')) {
      setError('Please enter a nickname or enable anonymous mode');
      setLoading(false);
      return;
    }

    const moodScore = calculateMoodScore(formData.emotional_scan);
    const registrationData = { ...formData, mood_score: moodScore };

    try {
      const result = await register(registrationData);
      setLoading(false);

      if (result.success) {
        showToast('Account created successfully! Welcome to NexaNova 🌱', 'success');
        navigate('/dashboard');
      } else {
        const msg = result.message || 'Registration failed. Please try again.';
        setError(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      setError('Registration failed. Check network/backend.');
      showToast('Registration error', 'error');
    }
  };

  const updateFormData = (field, value) => setFormData({ ...formData, [field]: value });

  return (
    <div className="onboarding">
      <div className="progress-bar">
        <div className="progress" style={{ width: `${(step / 4) * 100}%` }} />
      </div>
      <div className="onboarding-container">
        {error && <div className="error-banner"><span>⚠️</span><span>{error}</span><button onClick={() => setError('')}>✕</button></div>}
        {step === 1 && <WelcomeStep onNext={handleNext} formData={formData} updateFormData={updateFormData} />}
        {step === 2 && <PathSelectionStep selectedPath={formData.path} onSelect={(path) => updateFormData('path', path)} onNext={handleNext} formData={formData} updateFormData={updateFormData} />}
        {step === 3 && <PrivacySetupStep formData={formData} updateFormData={updateFormData} onNext={handleNext} />}
        {step === 4 && <EmotionalScanStep formData={formData} updateFormData={updateFormData} onComplete={handleComplete} loading={loading} />}
      </div>
    </div>
  );
};

export default Onboarding;
