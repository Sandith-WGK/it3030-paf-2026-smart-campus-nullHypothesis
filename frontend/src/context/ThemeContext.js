import { createContext } from 'react';

export const ThemeContext = createContext({
  theme: 'SYSTEM',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  preferences: {}
});
