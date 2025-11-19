import React, { createContext, useContext, useState } from 'react';

const LocaleContext = createContext();
export const useLocale = () => useContext(LocaleContext);

export const LocaleProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');

  const switchLocale = (lang) => setLocale(lang);

  return (
    <LocaleContext.Provider value={{ locale, switchLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};
