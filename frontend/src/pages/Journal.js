import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import Navigation from '../components/Navigation';
import JournalPrompts from '../components/JournalPrompts';
import JournalTemplates from '../components/JournalTemplates';
import { soundEffects } from '../utils/soundEffects';
import '../styles/Journal.css';

const Journal = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    mood: 5,
    tags: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [filterDate, setFilterDate] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const response = await api.get('/journal');
      if (response.data && response.data.success) {
        const entriesWithParsedTags = (response.data.entries || []).map(entry => ({
          ...entry,
          tags: entry.tags ? (typeof entry.tags === 'string' ? JSON.parse(entry.tags) : entry.tags) : []
        }));
        setEntries(entriesWithParsedTags);
        
        // Sync with localStorage
        try {
          localStorage.setItem('journalEntries', JSON.stringify(entriesWithParsedTags));
        } catch (e) {
          console.warn('Could not save entries to localStorage:', e);
        }
      } else {
        showToast('Failed to load journal entries', 'error');
        // Fallback to localStorage
        const savedEntries = localStorage.getItem('journalEntries');
        if (savedEntries) {
          setEntries(JSON.parse(savedEntries));
        }
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load entries';
      showToast(errorMessage, 'error');
      
      // Fallback to localStorage for offline mode
      const savedEntries = localStorage.getItem('journalEntries');
      if (savedEntries) {
        try {
          setEntries(JSON.parse(savedEntries));
          showToast('Loaded entries from offline storage', 'info');
        } catch (e) {
          console.error('Error parsing saved entries:', e);
        }
      }
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.content.trim()) return;

    try {
      const tagsArray = newEntry.tags.split(',').map(t => t.trim()).filter(t => t);
      
      const response = await api.post('/journal', {
        title: newEntry.title || null,
        content: newEntry.content,
        mood: newEntry.mood,
        tags: tagsArray,
        date: newEntry.date
      });

      if (response.data && response.data.success) {
        soundEffects.success();
        showToast('Journal entry saved successfully! 📔', 'success');
        await loadEntries();
        setNewEntry({
          title: '',
          content: '',
          mood: 5,
          tags: '',
          date: new Date().toISOString().split('T')[0]
        });
        setShowAddForm(false);
      } else {
        showToast(response.data?.message || 'Failed to save entry', 'error');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save entry';
      showToast(errorMessage, 'error');
      
      // Fallback: save to localStorage for offline
      try {
        const entry = {
          id: Date.now(),
          ...newEntry,
          tags: newEntry.tags.split(',').map(t => t.trim()).filter(t => t),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _pendingSync: true // Mark for sync
        };
        const updatedEntries = [entry, ...entries];
        setEntries(updatedEntries);
        localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
        showToast('Entry saved offline. Will sync when online.', 'info');
        setNewEntry({
          title: '',
          content: '',
          mood: 5,
          tags: '',
          date: new Date().toISOString().split('T')[0]
        });
        setShowAddForm(false);
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Delete this journal entry?')) return;

    try {
      const response = await api.delete(`/journal/${id}`);
      if (response.data.success) {
        showToast('Journal entry deleted successfully', 'success');
        await loadEntries();
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      // Fallback: remove from local state
      const updatedEntries = entries.filter(e => e.id !== id);
      setEntries(updatedEntries);
      localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
    }
  };

  const getMoodEmoji = (moodValue) => {
    if (moodValue <= 2) return '😢';
    if (moodValue <= 4) return '😐';
    if (moodValue <= 6) return '🙂';
    if (moodValue <= 8) return '😊';
    return '😄';
  };

  const getMoodLabel = (moodValue) => {
    if (moodValue <= 2) return 'Very Low';
    if (moodValue <= 4) return 'Low';
    if (moodValue <= 6) return 'Okay';
    if (moodValue <= 8) return 'Good';
    return 'Great';
  };

  const filteredEntries = entries.filter(entry => {
    if (filterDate !== 'all') {
      const entryDate = new Date(entry.date);
      const today = new Date();
      let filterDateObj;

      if (filterDate === 'today') {
        filterDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (entryDate.toDateString() !== filterDateObj.toDateString()) return false;
      } else if (filterDate === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        if (entryDate < weekAgo) return false;
      } else if (filterDate === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        if (entryDate < monthAgo) return false;
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = entry.title?.toLowerCase().includes(query);
      const matchesContent = entry.content.toLowerCase().includes(query);
      const matchesTags = entry.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchesTitle && !matchesContent && !matchesTags) return false;
    }

    return true;
  });

  const [currentPrompt, setCurrentPrompt] = useState("What am I grateful for today?");

  const handlePromptSelect = (prompt) => {
    setCurrentPrompt(prompt);
    setShowAddForm(true);
    // Scroll to form
    setTimeout(() => {
      document.querySelector('.journal-form-card')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTemplateSelect = (templateContent, templateTitle) => {
    setNewEntry({ 
      ...newEntry, 
      title: templateTitle,
      content: templateContent 
    });
    setShowAddForm(true);
    soundEffects.success();
    setTimeout(() => {
      document.querySelector('.journal-form-card')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="journal">
      <div className="container">
        <div className="journal-header">
          <div>
            <h2>My Journal</h2>
            <p>Your private space for reflection and growth</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '✕ Cancel' : '+ New Entry'}
          </button>
        </div>

        {/* Journal Prompts - Show when form is closed */}
        {!showAddForm && <JournalPrompts onSelectPrompt={handlePromptSelect} />}

        {showAddForm && (
          <div className="card journal-form-card">
            <h3>Write Your Journal Entry</h3>
            
            <div className="prompt-section">
              <div className="prompt-header">
                <span className="prompt-icon">💡</span>
                <span>Writing Prompt</span>
                <button className="prompt-refresh" onClick={() => setShowAddForm(false)}>
                  🔄 Browse More Prompts
                </button>
              </div>
              <p className="prompt-text">{currentPrompt}</p>
            </div>

            <div className="form-group">
              <label>Title (optional)</label>
              <input
                type="text"
                value={newEntry.title}
                onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                className="input-field"
                placeholder="Give your entry a title..."
              />
            </div>

            <div className="form-group">
              <label>How are you feeling? {getMoodEmoji(newEntry.mood)}</label>
              <div className="mood-selector">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newEntry.mood}
                  onChange={(e) => setNewEntry({ ...newEntry, mood: parseInt(e.target.value) })}
                  className="slider"
                />
                <div className="mood-indicator">
                  <span className="mood-emoji-large">{getMoodEmoji(newEntry.mood)}</span>
                  <span className="mood-label">{getMoodLabel(newEntry.mood)} ({newEntry.mood}/10)</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Your Thoughts</label>
              <textarea
                value={newEntry.content}
                onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                className="input-field journal-textarea"
                rows="8"
                placeholder="Write freely... What's on your mind? How are you feeling? What are you grateful for?"
              />
            </div>

            <div className="form-group">
              <label>Tags (comma-separated, optional)</label>
              <input
                type="text"
                value={newEntry.tags}
                onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                className="input-field"
                placeholder="e.g., gratitude, growth, challenge, reflection"
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setNewEntry({
                    title: '',
                    content: '',
                    mood: 5,
                    tags: '',
                    date: new Date().toISOString().split('T')[0]
                  });
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddEntry}
                disabled={!newEntry.content.trim()}
              >
                Save Entry
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="journal-filters">
          <div className="filter-group">
            <label>Filter by Date</label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Entries</option>
              <option value="today">Today</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field search-input"
              placeholder="Search entries..."
            />
          </div>
        </div>

        {/* Journal Entries */}
        <div className="journal-entries">
          {filteredEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📔</div>
              <h3>No journal entries yet</h3>
              <p>Start your journaling journey by writing your first entry</p>
              <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                Write Your First Entry
              </button>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onDelete={handleDeleteEntry}
                getMoodEmoji={getMoodEmoji}
              />
            ))
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
};

const JournalEntryCard = ({ entry, onDelete, getMoodEmoji }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentPreview = entry.content.length > 200 
    ? entry.content.substring(0, 200) + '...'
    : entry.content;

  return (
    <div className="card journal-entry-card">
      <div className="entry-header">
        <div className="entry-meta">
          {entry.title && <h3>{entry.title}</h3>}
          <div className="entry-date-mood">
            <span className="entry-date">
              {new Date(entry.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <span className="entry-mood">
              {getMoodEmoji(entry.mood)} {entry.mood}/10
            </span>
          </div>
        </div>
        <button
          className="delete-btn"
          onClick={() => onDelete(entry.id)}
          title="Delete entry"
        >
          🗑️
        </button>
      </div>

      <div className="entry-content">
        {isExpanded ? (
          <p className="entry-text">{entry.content}</p>
        ) : (
          <p className="entry-text">{contentPreview}</p>
        )}
        {entry.content.length > 200 && (
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : 'Read More'}
          </button>
        )}
      </div>

      {entry.tags && entry.tags.length > 0 && (
        <div className="entry-tags">
          {entry.tags.map((tag, idx) => (
            <span key={idx} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default Journal;

