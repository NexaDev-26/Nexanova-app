import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import AITools from './AITools';
import GuidedConversations from './GuidedConversations';
import '../styles/AIChatPopup.css';

const AIChatPopup = ({ onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [showTools, setShowTools] = useState(false);
  const [showGuided, setShowGuided] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle back button on mobile devices
  useEffect(() => {
    const handleBackButton = (event) => {
      event.preventDefault();
      onClose();
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handleBackButton);
    
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onClose]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get('/chat/history');
      if (response.data.success) {
        const chats = response.data.chats || [];
        const formattedMessages = chats.flatMap(chat => [
          { type: 'user', text: chat.message },
          { type: 'ai', text: chat.response, suggestions: [] }
        ]);
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || loading) return;

    setLoading(true);
    const newUserMessage = { type: 'user', text: messageText.trim() };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await api.post('/chat', {
        message: messageText.trim(),
        mood_score: user?.mood_score || 5,
        context: { path: user?.path }
      });

      if (response.data.success) {
        const aiMessage = {
          type: 'ai',
          text: response.data.response,
          suggestions: response.data.suggestions || []
        };
        setMessages(prev => [...prev, aiMessage]);
        setSuggestions(response.data.suggestions || []);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.message || 'Connection error';
      showToast(`Failed to send message: ${errorMessage}`, 'error');
      const errorAiMessage = {
        type: 'ai',
        text: 'I apologize, but I encountered an error. Please try again or check your connection.',
        suggestions: []
      };
      setMessages(prev => [...prev, errorAiMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const messageText = input.trim();
    setInput('');
    await sendMessage(messageText);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (suggestion) => {
    sendMessage(suggestion.text);
  };

  const handleToolSelect = (tool) => {
    // Generate appropriate message based on tool
    let toolMessage = '';
    switch(tool.id) {
      case 'breathing':
        toolMessage = 'Guide me through a 4-7-8 breathing exercise';
        break;
      case 'grounding':
        toolMessage = 'Help me with the 5-4-3-2-1 grounding technique';
        break;
      case 'mood-check':
        toolMessage = 'Let\'s do a mood check-in. How am I feeling?';
        break;
      case 'sleep':
        toolMessage = 'Tell me a relaxing sleep story';
        break;
      case 'meditation':
        toolMessage = 'Guide me through a 5-minute mindfulness meditation';
        break;
      case 'crisis':
        toolMessage = 'I need immediate support and resources';
        break;
      default:
        toolMessage = `Help me with ${tool.name.toLowerCase()}`;
    }
    
    setShowTools(false);
    sendMessage(toolMessage);
  };

  const handleConversationStart = (prompt) => {
    setInput(prompt);
    setShowGuided(false);
  };

  return (
    <div className="ai-chat-popup-overlay">
      <div className="ai-chat-popup">
        <div className="popup-header">
          <div className="popup-header-content">
            <h3>💬 Chat with NeNo</h3>
            <div className="popup-actions">
              <button
                className={`popup-action-btn ${showTools ? 'active' : ''}`}
                onClick={() => {
                  setShowTools(!showTools);
                  setShowGuided(false);
                }}
                title="Tools"
              >
                🛠️
              </button>
              <button
                className={`popup-action-btn ${showGuided ? 'active' : ''}`}
                onClick={() => {
                  setShowGuided(!showGuided);
                  setShowTools(false);
                }}
                title="Guided Conversations"
              >
                💬
              </button>
              <button
                className="popup-close-btn"
                onClick={onClose}
                title="Back to app"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {showTools && (
          <div className="popup-tools-section">
            <AITools onToolSelect={handleToolSelect} />
          </div>
        )}

        {showGuided && (
          <div className="popup-guided-section">
            <GuidedConversations onConversationStart={handleConversationStart} />
          </div>
        )}

        <div className="popup-messages-container">
          {loadingHistory ? (
            <LoadingSpinner size="medium" text="Loading chat..." />
          ) : messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-icon">💬</div>
              <h3>Start a conversation</h3>
              <p>Ask NeNo anything about your journey, habits, or wellbeing</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.type}`}>
                <div className="message-content">
                  {msg.text}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="message ai">
              <div className="message-content typing-indicator">
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="popup-input-container">
          <div className="suggestions-bar">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="quick-suggestion"
                onClick={() => handleSuggestion(suggestion)}
              >
                {suggestion.icon} {suggestion.text}
              </button>
            ))}
          </div>
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows="2"
              className="chat-input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="send-btn"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatPopup;

