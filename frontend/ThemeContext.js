// ThemeContext.js

import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light'); // Default theme

  const themes = {
    light: {
      backgroundColor: '#fff',
      textColor: '#000',
      inputBorderColor: '#ccc',
    },
    dark: {
      backgroundColor: '#333',
      textColor: '#fff',
      inputBorderColor: '#666',
    },
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme: themes[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);