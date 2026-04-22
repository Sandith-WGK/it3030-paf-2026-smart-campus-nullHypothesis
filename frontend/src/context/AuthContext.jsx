import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userService } from '../services/api/userService';
import { isAuthenticated as checkTokenValid } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => checkTokenValid());

  const isValidPictureSrc = (value) => {
    if (!value || typeof value !== 'string') return false;
    return (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('data:image/')
    );
  };

  // Helper to decode JWT payload
  const decodeToken = (token) => {
    try {
      const payloadBase64Url = token.split('.')[1];
      const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadBase64.padEnd(payloadBase64.length + (4 - (payloadBase64.length % 4)) % 4, '=');
      const payload = JSON.parse(atob(padded));
      return payload;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      const decodedUser = decodeToken(token);
      
      if (decodedUser) {
        // Recover large base64 picture from local cache since backend JWT omits it to save header size
        const savedPic = localStorage.getItem('user_pic');
        if (!isValidPictureSrc(decodedUser.picture) && isValidPictureSrc(savedPic)) {
          decodedUser.picture = savedPic;
        } else if (isValidPictureSrc(decodedUser.picture)) {
          localStorage.setItem('user_pic', decodedUser.picture);
        } else if (decodedUser.picture && !isValidPictureSrc(decodedUser.picture)) {
          // Ignore invalid non-url values (prevents broken <img> src like "profile")
          decodedUser.picture = '';
        }
        console.log('[DEBUG] AuthContext -> Setting user from DECODED TOKEN:', decodedUser);
        setUser(decodedUser); // eslint-disable-line react-hooks/set-state-in-effect
        setIsAuthenticated(true);

        const id = decodedUser.userId || decodedUser.sub || decodedUser.id;
        if (id) {
          (async () => {
            try {
              const freshUser = await userService.getUserById(id);
              if (isValidPictureSrc(freshUser?.picture)) localStorage.setItem('user_pic', freshUser.picture);
              console.log('[DEBUG] AuthContext -> Merging fresh user from BACKEND:', freshUser);
              setUser(prev => ({ ...prev, ...freshUser }));
            } catch (err) {
              console.error('[DEBUG] AuthContext -> Fresh user fetch failed:', err);
            }
          })();
        }
      } else {
        setIsAuthenticated(false);
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user_pic');
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, [token]);

  // Auto-Logout when token expires mid-session (checked every 60 seconds)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (!checkTokenValid()) {
        setToken(null);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  const login = useCallback((newToken, userData = null) => {
    localStorage.setItem('token', newToken);
    
    // 1. Start with values from the decoded token
    let mergedUser = decodeToken(newToken);
    
    // 2. If literal user data was provided (from an API response), prefer its values
    // especially for large fields like 'picture' which are omitted from the JWT header
    if (userData && mergedUser) {
      mergedUser = { ...mergedUser, ...userData };
    }

    if (mergedUser) {
      if (isValidPictureSrc(mergedUser.picture)) {
        localStorage.setItem('user_pic', mergedUser.picture);
      } else {
        const savedPic = localStorage.getItem('user_pic');
        if (isValidPictureSrc(savedPic)) mergedUser.picture = savedPic;
      }
    }
    
    setToken(newToken);
  }, []);

  const updateUser = useCallback((newData) => {
    setUser(prev => {
      if (!prev) return null;
      
      // Deep merge for preferences to ensure we don't lose existing fields
      const updatedPreferences = newData.preferences 
        ? { ...(prev.preferences || {}), ...newData.preferences }
        : prev.preferences;

      const updatedNotifPreferences = newData.notificationPreferences
        ? { ...(prev.notificationPreferences || {}), ...newData.notificationPreferences }
        : prev.notificationPreferences;

      console.log('[DEBUG] AuthContext -> Performing Deep Merge Update. Changes:', newData);
      const updated = { 
        ...prev, 
        ...newData, 
        preferences: updatedPreferences,
        notificationPreferences: updatedNotifPreferences 
      };
      console.log('[DEBUG] AuthContext -> Final Updated User Object:', updated);
      
      // Sync large fields to localStorage if they were updated
      if (isValidPictureSrc(newData.picture)) {
        localStorage.setItem('user_pic', newData.picture);
      }
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);