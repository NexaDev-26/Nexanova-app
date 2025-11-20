import React, { createContext, useState, useContext } from 'react';
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);
export const ThemeProvider = ({ children }) => {
  const [theme] = useState('light');
  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
};
