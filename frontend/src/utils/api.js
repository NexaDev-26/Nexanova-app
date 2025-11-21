import React, { useState } from 'react';
import api from '../utils/api'; // import the cleaned-up api.js
import { useNavigate } from 'react-router-dom';

const Onboarding = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // For emotional scan (example fields)
  const [mood, setMood] = useState('');
  const [stressLevel, setStressLevel] = useState('');

  const handleRegistration = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log('✅ Registration successful:', user);

      // Proceed to emotional scan immediately after registration
      await handleEmotionalScan(user.id);

      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Registration failed:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmotionalScan = async (userId) => {
    try {
      const response = await api.post('/emotions/scan', {
        userId,
        mood,
        stressLevel,
        timestamp: new Date().toISOString(),
      });

      console.log('🌟 Emotional scan saved:', response.data);
    } catch (err) {
      console.warn('⚠️ Emotional scan not saved:', err.message);
      // Offline request will be queued automatically by api.js if offline
    }
  };

  return (
    <div className="onboarding-container">
      <h2>Welcome! Let's get started</h2>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      <h3>Emotional Scan</h3>
      <input
        type="text"
        placeholder="Current Mood"
        value={mood}
        onChange={(e) => setMood(e.target.value)}
      />
      <input
        type="number"
        placeholder="Stress Level (1-10)"
        value={stressLevel}
        onChange={(e) => setStressLevel(e.target.value)}
      />

      {error && <p className="error">{error}</p>}
      <button onClick={handleRegistration} disabled={loading}>
        {loading ? 'Processing...' : 'Register & Scan'}
      </button>
    </div>
  );
};

export default Onboarding;
