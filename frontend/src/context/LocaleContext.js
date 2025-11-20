import React, { createContext, useContext, useState } from 'react';
import api from '../utils/api';

api.post('/api/auth/register', userData)

const LocaleContext = createContext();
export const useLocale = () => useContext(LocaleContext);
export const LocaleProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
};
