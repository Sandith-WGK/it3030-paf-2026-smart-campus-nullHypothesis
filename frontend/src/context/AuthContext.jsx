import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userService } from '../services/api/userService';
import { isAuthenticated as checkTokenValid } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => checkTokenValid());

  // Helper to decode JWT payload
  const decodeToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch (e) {
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
        if (!decodedUser.picture && savedPic) {
          decodedUser.picture = savedPic;
        } else if (decodedUser.picture) {
          localStorage.setItem('user_pic', decodedUser.picture);
        }
        setUser(decodedUser);
        setIsAuthenticated(true);

        // If key fields are missing from token (common after relogin for big picture),
        // fetch the full user record once and merge it.
        if (!decodedUser.picture || !decodedUser.provider) {
          const id = decodedUser.userId || decodedUser.sub || decodedUser.id;
          if (id) {
            (async () => {
              try {
                const freshUser = await userService.getUserById(id);
                if (freshUser?.picture) localStorage.setItem('user_pic', freshUser.picture);
                setUser(prev => ({ ...prev, ...freshUser }));
              } catch (e) {
                // Non-fatal: profile will fall back to avatar placeholder
              }
            })();
          }
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
      if (mergedUser.picture) {
        localStorage.setItem('user_pic', mergedUser.picture);
      } else {
        const savedPic = localStorage.getItem('user_pic');
        if (savedPic) mergedUser.picture = savedPic;
      }
    }
    
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);