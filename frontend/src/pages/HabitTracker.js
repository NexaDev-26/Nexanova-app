import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import Navigation from '../components/Navigation';
import { SkeletonCard } from '../components/SkeletonLoader';
import HabitHeatmap from '../components/HabitHeatmap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { soundEffects } from '../utils/soundEffects';
import '../styles/HabitTracker.css';

const HabitTracker = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('my-habits');
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // list, calendar, stats
  const [newHabit, setNewHabit] = useState({
    title: '',
    type: 'build',
    category: '',
    difficulty: 'easy',
    frequency: 'daily',
    reminder_time: '',
    description: '',
    trigger: '',
    replacement: ''
  });
  const [journalEntry, setJournalEntry] = useState({ habit_id: null, note: '', trigger: '', mood: 5 });
  const [stats, setStats] = useState({});
  const [aiInsight, setAiInsight] = useState('');

  // Define all functions first before using them
  const loadHabits = async () => {
    try {
      const response = await api.get('/habits');
      if (response.data.success) {
        setHabits(response.data.habits || []);
        return response.data.habits || [];
      }
      return [];
    } catch (error) {
      console.error('Error loading habits:', error);
      return [];
    }
  };


  const loadStats = (habitsList, completionsMap) => {
    const statsData = {
      totalHabits: habitsList.length,
      activeStreaks: habitsList.filter(h => h.streak > 0).length,
      totalCompletions: Object.values(completionsMap).flat().length,
      longestStreak: Math.max(...habitsList.map(h => h.streak), 0),
      weeklyCompletion: calculateWeeklyCompletion(completionsMap),
      monthlyCompletion: calculateMonthlyCompletion(completionsMap)
    };
    setStats(statsData);
  };

  const calculateWeeklyCompletion = (completionsMap) => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayCompletions = Object.values(completionsMap || completions)
        .flat()
        .filter(c => c.completion_date === dateStr).length;
      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completions: dayCompletions
      });
    }
    return last7Days;
  };

  const calculateMonthlyCompletion = (completionsMap) => {
    const monthData = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayCompletions = Object.values(completionsMap || completions)
        .flat()
        .filter(c => c.completion_date === dateStr).length;
      monthData.push({
        date: date.getDate(),
        completions: dayCompletions
      });
    }
    return monthData;
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load habits first, then completions (which depends on habits)
      const loadedHabits = await loadHabits();
      const completionMap = {};
      for (const habit of loadedHabits) {
        const response = await api.get(`/habits/${habit.id}/completions`);
        if (response.data.success) {
          completionMap[habit.id] = response.data.completions || [];
        }
      }
      setCompletions(completionMap);
      // Load stats with the data we just loaded
      loadStats(loadedHabits, completionMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedHabit) {
      generateAIInsight(selectedHabit);
    }
  }, [selectedHabit]);

  if (loading) {
    return (
      <div className="habit-tracker">
        <div className="container">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
        <Navigation />
      </div>
    );
  }

  const handleAddHabit = async () => {
    if (!newHabit.title.trim()) {
      showToast('Please enter a habit name', 'error');
      return;
    }

    try {
      // Clean up the data - convert empty strings to null for optional fields
      const habitData = {
        title: newHabit.title.trim(),
        type: newHabit.type,
        category: newHabit.category.trim() || null,
        difficulty: newHabit.difficulty || 'easy',
        frequency: newHabit.frequency || 'daily',
        reminder_time: newHabit.reminder_time.trim() || null,
        description: newHabit.description.trim() || null,
        trigger: newHabit.trigger.trim() || null,
        replacement: newHabit.replacement.trim() || null
      };

      const response = await api.post('/habits', habitData);

      if (response.data.success) {
        // Reload all data
        await loadAllData();
        setNewHabit({
          title: '',
          type: 'build',
          category: '',
          difficulty: 'easy',
          frequency: 'daily',
          reminder_time: '',
          description: '',
          trigger: '',
          replacement: ''
        });
        setShowAddForm(false);
        showToast('Habit created successfully! ✨', 'success');
      } else {
        showToast(response.data.message || 'Failed to create habit', 'error');
      }
    } catch (error) {
      console.error('Error adding habit:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to add habit. Please check your connection and try again.';
      showToast(errorMessage, 'error');
    }
  };

  const handleTemplateSelect = (template) => {
    setNewHabit(template);
    setShowAddForm(true);
    soundEffects.success();
  };

  const handleToggleCompletion = async (habitId, completed) => {
    if (completed) {
      soundEffects.complete();
    } else {
      soundEffects.click();
    }
    try {
      const response = await api.patch(`/habits/${habitId}`, { completed_today: completed });
      
      if (response.data.success) {
        // Show success message
        showToast(
          completed 
            ? '✅ Habit marked as completed!' 
            : 'Habit completion removed',
          completed ? 'success' : 'info'
        );
        
        // Reload all data
        const loadedHabits = await loadHabits();
        const completionMap = {};
        for (const habit of loadedHabits) {
          const response = await api.get(`/habits/${habit.id}/completions`);
          if (response.data.success) {
            completionMap[habit.id] = response.data.completions || [];
          }
        }
        setCompletions(completionMap);
        loadStats(loadedHabits, completionMap);
      }
    } catch (error) {
      console.error('Error updating habit:', error);
      showToast(
        error.response?.data?.message || 'Failed to update habit. Please try again.',
        'error'
      );
    }
  };

  const handleAddJournal = async () => {
    if (!journalEntry.note.trim() || !journalEntry.habit_id) return;

    try {
      await api.patch(`/habits/${journalEntry.habit_id}`, {
        completed_today: true,
        notes: journalEntry.note,
        trigger: journalEntry.trigger,
        mood: journalEntry.mood
      });
      const loadedHabits = await loadHabits();
      const completionMap = {};
      for (const habit of loadedHabits) {
        const response = await api.get(`/habits/${habit.id}/completions`);
        if (response.data.success) {
          completionMap[habit.id] = response.data.completions || [];
        }
      }
      setCompletions(completionMap);
      loadStats(loadedHabits, completionMap);
      setShowJournalModal(false);
      setJournalEntry({ habit_id: null, note: '', trigger: '', mood: 5 });
    } catch (error) {
      console.error('Error adding journal:', error);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!window.confirm('Are you sure you want to delete this habit?')) return;

    try {
      await api.delete(`/habits/${habitId}`);
      const loadedHabits = await loadHabits();
      const completionMap = {};
      for (const habit of loadedHabits) {
        const response = await api.get(`/habits/${habit.id}/completions`);
        if (response.data.success) {
          completionMap[habit.id] = response.data.completions || [];
        }
      }
      setCompletions(completionMap);
      loadStats(loadedHabits, completionMap);
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const generateAIInsight = async (habit) => {
    // Generate AI insight based on habit performance
    const insights = [
      `"Haba na haba hujaza kibaba" - Little by little fills the pot. Your ${habit.streak}-day streak shows consistency!`,
      `You're building momentum! ${habit.streak} days strong. Remember: "Mvumilivu hula mbivu" - The patient one eats the ripe fruit.`,
      `Great progress! Every day you complete this habit, you're one step closer to transformation. Keep going!`,
      `Your consistency is inspiring! ${habit.streak} days shows real commitment. You're stronger than you think.`
    ];
    setAiInsight(insights[Math.floor(Math.random() * insights.length)]);
  };

  const applyTemplate = (template) => {
    setNewHabit({
      ...newHabit,
      title: template.title,
      category: template.category,
      description: template.description,
      difficulty: template.difficulty
    });
    setShowTemplateModal(false);
    setShowAddForm(true);
  };

  const filteredHabits = habits.filter(h => {
    if (activeTab === 'build') return h.type === 'build';
    if (activeTab === 'break') return h.type === 'break';
    return true;
  });

  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = (habit) => habit.last_completed === today;

  const HABIT_TEMPLATES = [
    { title: 'Drink 8 glasses of water', category: 'Health', difficulty: 'easy', description: 'Stay hydrated daily' },
    { title: 'Exercise for 30 minutes', category: 'Health', difficulty: 'medium', description: 'Physical activity for wellness' },
    { title: 'Read for 20 minutes', category: 'Learning', difficulty: 'easy', description: 'Expand your knowledge' },
    { title: 'Meditate for 10 minutes', category: 'Mind', difficulty: 'easy', description: 'Practice mindfulness' },
    { title: 'Save 500 TZS daily', category: 'Finance', difficulty: 'easy', description: 'Build savings habit' },
    { title: 'Write gratitude journal', category: 'Mind', difficulty: 'easy', description: 'Practice gratitude' },
    { title: 'No social media before noon', category: 'Productivity', difficulty: 'medium', description: 'Reduce distractions' },
    { title: 'Eat 5 servings of fruits/vegetables', category: 'Health', difficulty: 'medium', description: 'Improve nutrition' }
  ];

  const CATEGORIES = ['Health', 'Finance', 'Learning', 'Mind', 'Productivity', 'Relationships', 'Other'];
  const DIFFICULTIES = ['easy', 'medium', 'hard'];

  return (
    <div className="habit-tracker">
      <div className="container">
        <div className="habit-header">
          <div>
            <h2>Habit Tracker</h2>
            <p>Transform your life, one habit at a time</p>
          </div>
          <div className="view-mode-selector">
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List
            </button>
            <button
              className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Calendar
            </button>
            <button
              className={`view-btn ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => setViewMode('stats')}
            >
              📊 Stats
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-icon">✨</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalHabits || 0}</div>
              <div className="stat-label">Total Habits</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeStreaks || 0}</div>
              <div className="stat-label">Active Streaks</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">{stats.longestStreak || 0}</div>
              <div className="stat-label">Longest Streak</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalCompletions || 0}</div>
              <div className="stat-label">Total Completions</div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="tabs-enhanced">
          <button
            className={`tab-enhanced ${activeTab === 'my-habits' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-habits')}
          >
            <span>📋</span>
            <span>My Habits</span>
          </button>
          <button
            className={`tab-enhanced ${activeTab === 'build' ? 'active' : ''}`}
            onClick={() => setActiveTab('build')}
          >
            <span>✨</span>
            <span>Building</span>
          </button>
          <button
            className={`tab-enhanced ${activeTab === 'break' ? 'active' : ''}`}
            onClick={() => setActiveTab('break')}
          >
            <span>🚫</span>
            <span>Breaking</span>
          </button>
          <button
            className={`tab-enhanced ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <span>📚</span>
            <span>Templates</span>
          </button>
          <button
            className={`tab-enhanced ${activeTab === 'challenges' ? 'active' : ''}`}
            onClick={() => setActiveTab('challenges')}
          >
            <span>🎯</span>
            <span>Challenge</span>
          </button>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {!showAddForm ? (
              <div className="action-buttons">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddForm(true)}
                >
                  + Add New Habit
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowTemplateModal(true)}
                >
                  📚 Use Template
                </button>
              </div>
            ) : (
              <div className="card add-habit-form-enhanced">
                <div className="form-header">
                  <h3>Create New Habit</h3>
                  <button className="close-btn" onClick={() => setShowAddForm(false)}>✕</button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Habit Name *</label>
                    <input
                      type="text"
                      value={newHabit.title}
                      onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Drink water, Exercise"
                    />
                  </div>
                  <div className="form-group">
                    <label>Type *</label>
                    <div className="toggle-group">
                      <button
                        className={`toggle-btn ${newHabit.type === 'build' ? 'active' : ''}`}
                        onClick={() => setNewHabit({ ...newHabit, type: 'build' })}
                      >
                        ✨ Build
                      </button>
                      <button
                        className={`toggle-btn ${newHabit.type === 'break' ? 'active' : ''}`}
                        onClick={() => setNewHabit({ ...newHabit, type: 'break' })}
                      >
                        🚫 Break
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={newHabit.category}
                      onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Difficulty</label>
                    <select
                      value={newHabit.difficulty}
                      onChange={(e) => setNewHabit({ ...newHabit, difficulty: e.target.value })}
                      className="input-field"
                    >
                      {DIFFICULTIES.map(diff => (
                        <option key={diff} value={diff}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Frequency</label>
                    <select
                      value={newHabit.frequency}
                      onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                      className="input-field"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reminder Time (optional)</label>
                    <input
                      type="time"
                      value={newHabit.reminder_time}
                      onChange={(e) => setNewHabit({ ...newHabit, reminder_time: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  {newHabit.type === 'break' && (
                    <>
                      <div className="form-group">
                        <label>Habit Trigger (What makes you do this?)</label>
                        <input
                          type="text"
                          value={newHabit.trigger}
                          onChange={(e) => setNewHabit({ ...newHabit, trigger: e.target.value })}
                          className="input-field"
                          placeholder="e.g., When I feel stressed..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Replacement Habit (What will you do instead?)</label>
                        <input
                          type="text"
                          value={newHabit.replacement}
                          onChange={(e) => setNewHabit({ ...newHabit, replacement: e.target.value })}
                          className="input-field"
                          placeholder="e.g., Take 5 deep breaths"
                        />
                      </div>
                    </>
                  )}
                  <div className="form-group full-width">
                    <label>Description (optional)</label>
                    <textarea
                      value={newHabit.description}
                      onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                      className="input-field"
                      rows="3"
                      placeholder="Why is this habit important to you?"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleAddHabit}
                    disabled={!newHabit.title.trim()}
                  >
                    Create Habit
                  </button>
                </div>
              </div>
            )}

            {/* Habits List */}
            {activeTab !== 'templates' && activeTab !== 'challenges' && (
              <div className="habits-list-enhanced">
                {filteredHabits.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">✨</div>
                    <h3>No habits yet</h3>
                    <p>Start building your future by adding your first habit!</p>
                    <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                      Add Your First Habit
                    </button>
                  </div>
                ) : (
                  filteredHabits.map((habit) => (
                    <EnhancedHabitCard
                      key={habit.id}
                      habit={habit}
                      isCompleted={isCompletedToday(habit)}
                      onToggle={(completed) => handleToggleCompletion(habit.id, completed)}
                      onDelete={() => handleDeleteHabit(habit.id)}
                      onJournal={() => {
                        setSelectedHabit(habit);
                        setJournalEntry({ ...journalEntry, habit_id: habit.id });
                        setShowJournalModal(true);
                      }}
                      onViewDetails={() => {
                        setSelectedHabit(habit);
                        setShowStatsModal(true);
                      }}
                      completions={completions[habit.id] || []}
                    />
                  ))
                )}
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="templates-grid">
                {HABIT_TEMPLATES.map((template, idx) => (
                  <div key={idx} className="template-card">
                    <div className="template-icon">{getCategoryIcon(template.category)}</div>
                    <h4>{template.title}</h4>
                    <p>{template.description}</p>
                    <div className="template-meta">
                      <span className="template-category">{template.category}</span>
                      <span className="template-difficulty">{template.difficulty}</span>
                    </div>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => applyTemplate(template)}
                    >
                      Use This Template
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Challenges Tab */}
            {activeTab === 'challenges' && (
              <div className="challenges-section">
                <div className="card challenge-card-large">
                  <div className="challenge-icon">🔥</div>
                  <h3>30-Day Habit Challenge</h3>
                  <p>Commit to completing your habits for 30 days straight. Build unbreakable consistency!</p>
                  <div className="challenge-stats">
                    <div className="challenge-stat">
                      <span className="stat-value">30</span>
                      <span className="stat-label">Days</span>
                    </div>
                    <div className="challenge-stat">
                      <span className="stat-value">🏆</span>
                      <span className="stat-label">Badge Reward</span>
                    </div>
                  </div>
                  <button className="btn btn-primary">Start Challenge</button>
                </div>
                <div className="card challenge-card-large">
                  <div className="challenge-icon">💪</div>
                  <h3>Habit Stacking Challenge</h3>
                  <p>Link 3 habits together using the Atomic Habits method. Build a powerful routine!</p>
                  <button className="btn btn-primary">Learn More</button>
                </div>
                <div className="card challenge-card-large">
                  <div className="challenge-icon">🌱</div>
                  <h3>Micro-Habit Challenge</h3>
                  <p>Start with tiny habits (2 minutes) and watch them grow. Perfect for beginners!</p>
                  <button className="btn btn-primary">Start Small</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="calendar-view">
            {habits.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <h3>No habits to display</h3>
                <p>Add habits to see your activity calendar</p>
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                  Add Your First Habit
                </button>
              </div>
            ) : (
              <div className="habits-heatmap-grid">
                {habits.map((habit) => (
                  <div key={habit.id} className="habit-heatmap-wrapper">
                    <div className="heatmap-habit-header">
                      <h4>{habit.title}</h4>
                      <span className="heatmap-streak">🔥 {habit.streak} days</span>
                    </div>
                    <HabitHeatmap 
                      habitId={habit.id}
                      completions={completions[habit.id] || []}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats View */}
        {viewMode === 'stats' && (
          <div className="stats-view">
            <div className="stats-charts">
              <div className="chart-card">
                <h3>Weekly Completion Rate</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.weeklyCompletion || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completions" fill="#14b8a6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3>Monthly Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.monthlyCompletion || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completions" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="insights-section">
              <h3>AI Insights</h3>
              <div className="insight-card">
                <p>{aiInsight || 'Complete habits to see personalized insights!'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Modal */}
        {showStatsModal && selectedHabit && (
          <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
            <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedHabit.title} - Statistics</h3>
                <button className="close-btn" onClick={() => setShowStatsModal(false)}>✕</button>
              </div>
              <div className="stats-modal-content">
                <HabitHeatmap 
                  habitId={selectedHabit.id}
                  completions={completions[selectedHabit.id] || []}
                />
                <div className="habit-detailed-stats">
                  <div className="stat-card">
                    <div className="stat-icon">🔥</div>
                    <div className="stat-info">
                      <span className="stat-label">Current Streak</span>
                      <span className="stat-value-large">{selectedHabit.streak} days</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                      <span className="stat-label">Completion Rate</span>
                      <span className="stat-value-large">
                        {completions[selectedHabit.id]?.length > 0 
                          ? Math.round((completions[selectedHabit.id].length / 30) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                      <span className="stat-label">Total Completions</span>
                      <span className="stat-value-large">{completions[selectedHabit.id]?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Journal Modal */}
        {showJournalModal && (
          <div className="modal-overlay" onClick={() => setShowJournalModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Habit Journal</h3>
                <button className="close-btn" onClick={() => setShowJournalModal(false)}>✕</button>
              </div>
              <div className="journal-form">
                <div className="form-group">
                  <label>How did it go today?</label>
                  <textarea
                    value={journalEntry.note}
                    onChange={(e) => setJournalEntry({ ...journalEntry, note: e.target.value })}
                    className="input-field"
                    rows="4"
                    placeholder="What triggered you? How did you feel? What did you learn?"
                  />
                </div>
                {selectedHabit?.type === 'break' && (
                  <div className="form-group">
                    <label>What triggered this habit?</label>
                    <input
                      type="text"
                      value={journalEntry.trigger}
                      onChange={(e) => setJournalEntry({ ...journalEntry, trigger: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Stress, boredom, social situation"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>How are you feeling? (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={journalEntry.mood}
                    onChange={(e) => setJournalEntry({ ...journalEntry, mood: parseInt(e.target.value) })}
                    className="slider"
                  />
                  <div className="mood-value">{journalEntry.mood}/10</div>
                </div>
                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={() => setShowJournalModal(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleAddJournal}>
                    Save Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

const EnhancedHabitCard = ({ habit, isCompleted, onToggle, onDelete, onJournal, onViewDetails, completions }) => {
  const getStreakBadge = (streak) => {
    if (streak >= 90) return { emoji: '🏆', label: 'Champion', color: '#f59e0b' };
    if (streak >= 60) return { emoji: '⭐', label: 'Star', color: '#8b5cf6' };
    if (streak >= 30) return { emoji: '🔥', label: 'On Fire', color: '#ef4444' };
    if (streak >= 21) return { emoji: '💪', label: 'Strong', color: '#10b981' };
    if (streak >= 7) return { emoji: '✨', label: 'Growing', color: '#14b8a6' };
    if (streak >= 3) return { emoji: '🌱', label: 'Starting', color: '#06b6d4' };
    return null;
  };

  const badge = getStreakBadge(habit.streak);
  const completionRate = completions.length > 0 
    ? Math.round((completions.length / 30) * 100) 
    : 0;

  return (
    <div className={`card habit-card-enhanced ${isCompleted ? 'completed' : ''}`}>
      <div className="habit-card-header">
        <div className="habit-main-info">
          <div className="habit-title-row">
            <h3>{habit.title}</h3>
            {badge && (
              <span className="streak-badge-enhanced" style={{ borderColor: badge.color }}>
                {badge.emoji} {habit.streak} days
              </span>
            )}
          </div>
          {habit.category && (
            <span className="habit-category">{getCategoryIcon(habit.category)} {habit.category}</span>
          )}
          {habit.description && (
            <p className="habit-description">{habit.description}</p>
          )}
        </div>
        <button className="delete-btn" onClick={onDelete} title="Delete habit">🗑️</button>
      </div>

      {habit.trigger && (
        <div className="habit-trigger">
          <strong>Trigger:</strong> {habit.trigger}
        </div>
      )}

      {habit.replacement && (
        <div className="habit-replacement">
          <strong>Replacement:</strong> {habit.replacement}
        </div>
      )}

      <div className="habit-stats-enhanced">
        <div className="stat-item">
          <span className="stat-label">Streak</span>
          <span className="stat-value">{habit.streak} days</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Completion Rate</span>
          <span className="stat-value">{completionRate}%</span>
        </div>
        {habit.last_completed && (
          <div className="stat-item">
            <span className="stat-label">Last Done</span>
            <span className="stat-value">
              {new Date(habit.last_completed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      <div className="habit-progress">
        <div className="progress-bar-habit">
          <div 
            className="progress-fill-habit"
            style={{ width: `${Math.min((habit.streak / 30) * 100, 100)}%` }}
          ></div>
        </div>
        <span className="progress-text">Progress to 30 days: {Math.min(habit.streak, 30)}/30</span>
      </div>

      <div className="habit-actions-enhanced">
        <label className="completion-toggle-enhanced">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => {
              e.stopPropagation();
              onToggle(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="toggle-label-enhanced">
            {isCompleted ? '✅ Completed today' : 'Mark as completed'}
          </span>
        </label>
        <div className="action-buttons-row">
          <button className="btn-icon-small" onClick={onJournal} title="Add journal entry">
            📔
          </button>
          <button className="btn-icon-small" onClick={onViewDetails} title="View details">
            📊
          </button>
        </div>
      </div>
    </div>
  );
};

const CalendarGrid = ({ date, habits, completions }) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Get today's date for comparison
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Get all completion dates for all habits
  const getAllCompletionDates = () => {
    const allDates = new Set();
    Object.values(completions).flat().forEach(completion => {
      if (completion.completion_date) {
        allDates.add(completion.completion_date);
      }
    });
    return allDates;
  };

  const completionDates = getAllCompletionDates();

  // Get active habits that should be completed daily
  const getActiveDailyHabits = () => {
    return habits.filter(h => 
      h.is_active !== false && 
      (h.frequency === 'daily' || !h.frequency) &&
      h.start_date
    );
  };

  const activeDailyHabits = getActiveDailyHabits();

  // Check if a date should have had completions (for past dates)
  const shouldHaveCompletions = (dateStr) => {
    if (!activeDailyHabits.length) return false;
    
    const checkDate = new Date(dateStr);
    const todayDate = new Date(todayStr);
    
    // Only check past dates and today
    if (checkDate > todayDate) return false;

    // Check if any habit was active on this date
    return activeDailyHabits.some(habit => {
      const habitStartDate = new Date(habit.start_date || habit.created_at);
      return checkDate >= habitStartDate && checkDate <= todayDate;
    });
  };

  const getDayCompletions = (day) => {
    if (!day) return 0;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return Object.values(completions)
      .flat()
      .filter(c => c.completion_date === dateStr).length;
  };

  const getDayStatus = (day) => {
    if (!day) return 'empty';
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = isCurrentMonth && day === today.getDate() && dateStr === todayStr;
    const hasCompletions = completionDates.has(dateStr);
    const shouldHaveCompleted = shouldHaveCompletions(dateStr);
    const completionCount = getDayCompletions(day);

    // Determine status
    if (isToday) {
      return 'today';
    } else if (hasCompletions) {
      return 'completed';
    } else if (shouldHaveCompleted && !hasCompletions) {
      // Past date that should have had completions but didn't
      return 'failed';
    } else {
      return 'normal';
    }
  };

  return (
    <div className="calendar-grid">
      <div className="calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}
      </div>
      <div className="calendar-days">
        {days.map((day, idx) => {
          const status = getDayStatus(day);
          return (
            <div key={idx} className={`calendar-day ${day ? status : 'empty'}`}>
              {day && (
                <>
                  <div className="day-number">{day}</div>
                  <div className="day-completions">
                    {getDayCompletions(day) > 0 && (
                      <span className="completion-dot">{getDayCompletions(day)}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color legend-blue"></span>
          <span>Today</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-green"></span>
          <span>Completed</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-red"></span>
          <span>Missed</span>
        </div>
      </div>
    </div>
  );
};

const getCategoryIcon = (category) => {
  const icons = {
    Health: '🏥',
    Finance: '💰',
    Learning: '📚',
    Mind: '🧠',
    Productivity: '⚡',
    Relationships: '👥',
    Other: '📦'
  };
  return icons[category] || '📦';
};

export default HabitTracker;
