import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeContext } from './ThemeContext';
import { useAuth } from './AuthContext';
import { userService } from '../services/api/userService';

export const ThemeProvider = ({ children }) => {
  const { user, isAuthenticated, updateUser } = useAuth();
  
  // 1. Theme State (Handles the visual mode)
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'SYSTEM';
  });

  const [resolvedTheme, setResolvedTheme] = useState('light');

  // 2. INTERNAL PREFERENCE STATE (The Mirror)
  // This state provides the "Instant UI Flip" the user is missing.
  // It initializes from localStorage/Context but is updated immediately on toggle.
  const [internalPrefs, setInternalPrefs] = useState(() => {
     const saved = localStorage.getItem('user_prefs');
     return saved ? JSON.parse(saved) : {
       enableSounds: true,
       enablePushNotifications: true,
       theme: 'SYSTEM'
     };
  });

  // Sync internal state with AuthContext when the user object arrives
  useEffect(() => {
    if (!user?.preferences) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInternalPrefs(prev => {
      // Merge first
      const next = { ...prev, ...user.preferences };
      // Bail out if nothing changed (prevents cascading renders)
      const unchanged = Object.keys(next).every((k) => Object.is(next[k], prev[k]));
      return unchanged ? prev : next;
    });
  }, [user]);

  // Sync theme to localStorage immediately when it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle visual theme application
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t) => {
      let resolved = t;
      if (t === 'SYSTEM') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'DARK' : 'LIGHT';
      }
      if (resolved === 'DARK') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setResolvedTheme(resolved.toLowerCase());
    };
    applyTheme(theme);

    if (theme === 'SYSTEM') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('SYSTEM');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Derived preferences for the context
  const preferences = useMemo(() => ({
    ...internalPrefs,
    theme: theme
  }), [internalPrefs, theme]);

  const updatePreferences = useCallback(async (updates) => {
    console.log('[DEBUG] ThemeProvider -> Instant Local Update:', updates);
    
    // 1. INSTANT UI FLIP (Local State)
    // This solves the 'Toggle doesn't apply' issue by updating the local mirror immediately.
    setInternalPrefs(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('user_prefs', JSON.stringify(next));
      return next;
    });

    if (updates.theme) setThemeState(updates.theme);

    // 2. Global Global Sync (AuthContext)
    if (updateUser) {
      updateUser({ preferences: updates });
    }

    // 3. Backend Persistence
    const identifier = user?.email || user?.id || user?.userId || user?.sub;
    if (isAuthenticated && identifier) {
       try {
         const updatedUser = await userService.updatePreferences(identifier, updates);
         if (updateUser && updatedUser) {
           updateUser(updatedUser);
         }
       } catch (error) {
         console.error('[DEBUG] ThemeProvider -> Backend Sync Failed:', error);
       }
    }
  }, [isAuthenticated, user, updateUser]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    updatePreferences({ theme: newTheme });
  }, [updatePreferences]);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'LIGHT' : 'DARK';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      resolvedTheme, 
      setTheme, 
      toggleTheme, 
      preferences,
      updatePreferences
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
