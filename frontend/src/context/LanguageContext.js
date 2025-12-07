import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translation files
import enTranslations from '../translations/en.json';
import swTranslations from '../translations/sw.json';

const translations = {
  en: enTranslations,
  sw: swTranslations
};

export const LanguageProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [language, setLanguage] = useState(() => {
    // Get from localStorage or default to 'en'
    const saved = localStorage.getItem('app_language');
    return saved || 'en';
  });

  // Load user's language preference from backend when authenticated
  useEffect(() => {
    const loadUserLanguage = async () => {
      if (isAuthenticated && user) {
        try {
          // Try to get language from user object first
          if (user.language) {
            setLanguage(user.language);
            localStorage.setItem('app_language', user.language);
            return;
          }
          
          // Otherwise fetch from backend
          const response = await api.get('/auth/profile');
          if (response.data.success && response.data.user?.language) {
            const userLang = response.data.user.language;
            setLanguage(userLang);
            localStorage.setItem('app_language', userLang);
          }
        } catch (error) {
          console.error('Error loading user language:', error);
          // Fallback to localStorage
        }
      }
    };

    loadUserLanguage();
  }, [isAuthenticated, user]);

  const changeLanguage = async (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('app_language', newLanguage);
    
    // Update backend if authenticated
    if (isAuthenticated) {
      try {
        await api.patch('/user/profile', { language: newLanguage });
      } catch (error) {
        console.error('Error updating language preference:', error);
      }
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language] || translations.en;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to English if translation missing
        let fallback = translations.en;
        for (const fk of keys) {
          fallback = fallback?.[fk];
        }
        value = fallback || key;
        break;
      }
    }
    
    // Replace parameters in translation string
    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }
    
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

