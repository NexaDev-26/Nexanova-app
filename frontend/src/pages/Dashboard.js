import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import api from '../utils/api';
import Navigation from '../components/Navigation';
import ProgressRing from '../components/ProgressRing';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonCard } from '../components/SkeletonLoader';
import AchievementBadges from '../components/AchievementBadges';
import AnalyticsInsights from '../components/AnalyticsInsights';
import PointsSystem from '../components/PointsSystem';
import { soundEffects } from '../utils/soundEffects';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLocale();
  const navigate = useNavigate();
  const [mood, setMood] = useState(5);
  const [todayFocus, setTodayFocus] = useState('');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({
    mind: 0,
    habit: 0,
    finance: 0
  });
  const [dailyQuote, setDailyQuote] = useState('');

  useEffect(() => {
    loadDashboardData();
    generateDailyQuote();
  }, []);

  useEffect(() => {
    generateTodayFocus();
  }, [language]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load data in parallel for better performance
      const [habitsRes, financeRes] = await Promise.allSettled([
        api.get('/habits'),
        api.get('/finance/summary')
      ]);

      // Process habits
      let habitProgress = 0;
      if (habitsRes.status === 'fulfilled' && habitsRes.value?.data) {
        const habits = habitsRes.value.data.habits || [];
        const completedHabits = habits.filter(h => {
          const today = new Date().toISOString().split('T')[0];
          return h.last_completed === today;
        });
        habitProgress = habits.length > 0 
          ? Math.round((completedHabits.length / habits.length) * 100)
          : 0;
      }

      // Process finance
      let financeProgress = 25;
      if (financeRes.status === 'fulfilled' && financeRes.value?.data) {
        const financeSummary = financeRes.value.data.summary || { balance: 0 };
        financeProgress = financeSummary.balance > 0 ? 50 : 25;
      }

      setProgress({
        mind: user?.mood_score ? Math.min(user.mood_score * 10, 100) : 50,
        habit: habitProgress,
        finance: financeProgress
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyQuote = () => {
    const quotes = [
      "Haba na haba hujaza kibaba - Little by little fills the pot.",
      "Mvumilivu hula mbivu - The patient one eats the ripe fruit.",
      "Kupanda mlima huanza na hatua moja - Climbing a mountain starts with one step.",
      "Juhudi zako hazitakosa matokeo - Your efforts will not lack results.",
      "Pamoja tunaweza - Together we can.",
      "Kila siku ni fursa mpya - Every day is a new opportunity."
    ];
    setDailyQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  };

  const generateTodayFocus = () => {
    const focuses = [
      { icon: '📝', text: t('dashboard.todayFocus.writeJournal') },
      { icon: '💰', text: t('dashboard.todayFocus.trackExpenses') },
      { icon: '✅', text: t('dashboard.todayFocus.completeHabits') },
      { icon: '🧘', text: t('dashboard.todayFocus.writeJournal') },
      { icon: '📊', text: t('dashboard.todayFocus.checkFinance') }
    ];
    const focus = focuses[Math.floor(Math.random() * focuses.length)];
    setTodayFocus(focus);
  };

  const getMoodEmoji = (moodValue) => {
    if (moodValue <= 2) return '😢';
    if (moodValue <= 4) return '😐';
    if (moodValue <= 6) return '🙂';
    if (moodValue <= 8) return '😊';
    return '😄';
  };

  const handleMoodChange = async (newMood) => {
    setMood(newMood);
    soundEffects.click();
    try {
      await api.patch(`/user/${user.id}`, { mood_score: newMood });
      // Award points for mood tracking
      if (newMood >= 7) {
        soundEffects.success();
      }
    } catch (error) {
      console.error('Error updating mood:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.goodMorning');
    if (hour < 18) return t('dashboard.greeting.goodAfternoon');
    return t('dashboard.greeting.goodEvening');
  };

  const getMotivationalMessage = () => {
    return t('dashboard.quote');
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">

        {/* Greeting Bar */}
        <div className="greeting-bar">
          <h2>
            {getGreeting()}, {user?.nickname || t('dashboard.greeting.friend')} 🌞
          </h2>
          <p>{getMotivationalMessage()}</p>
        </div>

        {/* Mood Tracker */}
        <div className="card mood-tracker">
          <h3>{t('dashboard.mood.title')}</h3>
          <div className="mood-slider-container">
            <div className="mood-emoji-above">
              {getMoodEmoji(mood)}
            </div>
            <div className="mood-slider">
              <span className="mood-emoji">😢</span>
              <input
                type="range"
                min="1"
                max="10"
                value={mood}
                onChange={(e) => handleMoodChange(parseInt(e.target.value))}
                className="slider"
              />
              <span className="mood-emoji">😄</span>
            </div>
            <div className="mood-value">{t('dashboard.mood.label')}: {mood}/10</div>
          </div>
        </div>

        {/* Today's Focus */}
        {todayFocus && (
          <div className="card today-focus">
            <div className="focus-icon">{todayFocus.icon}</div>
            <div>
              <h4>{t('dashboard.todayFocus.title')}</h4>
              <p>{todayFocus.text}</p>
            </div>
          </div>
        )}

        {/* Quick Actions - Wysa Icon Style */}
        <div className="quick-actions">
          <button
            className="action-btn reflect"
            onClick={() => navigate('/journal')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/journal')}
            aria-label="Go to Journal to reflect"
            tabIndex={0}
          >
            <div className="action-icon">📔</div>
            <span>Reflect</span>
          </button>
          <button
            className="action-btn grow"
            onClick={() => navigate('/habits')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/habits')}
            aria-label="Go to Habits to grow"
            tabIndex={0}
          >
            <div className="action-icon">🌱</div>
            <span>Grow</span>
          </button>
          <button
            className="action-btn heal"
            onClick={() => navigate('/ai-chat')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/ai-chat')}
            aria-label="Go to AI Chat to heal"
            tabIndex={0}
          >
            <div className="action-icon">💚</div>
            <span>Heal</span>
          </button>
        </div>

        {/* Points System */}
        <PointsSystem />

        {/* Progress Rings */}
        <div className="progress-section">
          <h3>{t('dashboard.progress.title')}</h3>
          <div className="progress-rings">
            <ProgressRing
              value={progress.mind}
              label={t('dashboard.progress.mindBalance')}
              color="#E86C4F"
            />
            <ProgressRing
              value={progress.habit}
              label={t('dashboard.progress.habitConsistency')}
              color="#D4E157"
            />
            <ProgressRing
              value={progress.finance}
              label={t('dashboard.progress.financialStability')}
              color="#4CAF50"
            />
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="card achievements-section">
          <h3>🏆 {t('dashboard.achievements.title')}</h3>
          <AchievementBadges limit={3} />
        </div>

        {/* Analytics Insights */}
        <AnalyticsInsights />

        {/* Daily Quote */}
        {dailyQuote && (
          <div className="card daily-quote">
            <div className="quote-icon">💬</div>
            <p className="quote-text">"{dailyQuote}"</p>
            <p className="quote-label">{t('dashboard.dailyQuote.africanProverb')}</p>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default Dashboard;

