import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AIChatPopup from './AIChatPopup';
import '../styles/FloatingAIChat.css';

const FloatingAIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return null;
  }

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Only show floating button when chat is CLOSED */}
      {!isOpen && (
        <button
          className="floating-ai-button"
          onClick={handleOpen}
          aria-label="Open AI Chat"
          title="Chat with NeNo"
        >
          <span className="ai-button-icon">💬</span>
        </button>
      )}
      
      {/* Full screen chat popup */}
      {isOpen && (
        <AIChatPopup onClose={handleClose} />
      )}
    </>
  );
};

export default FloatingAIChat;
