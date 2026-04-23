import { useState, useEffect, useCallback } from 'react';
import api from '../services/api/axios';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/favorites');
      setFavorites(response.data || []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const addFavorite = useCallback(async (resourceId) => {
    try {
      await api.post(`/favorites/${resourceId}`);
      await loadFavorites();
      return true;
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return false;
    }
  }, [loadFavorites]);

  const removeFavorite = useCallback(async (resourceId) => {
    try {
      await api.delete(`/favorites/${resourceId}`);
      await loadFavorites();
      return true;
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      return false;
    }
  }, [loadFavorites]);

  const isFavorite = useCallback(async (resourceId) => {
    try {
      const response = await api.get(`/favorites/check/${resourceId}`);
      return response.data.isFavorite;
    } catch (error) {
      console.error('Failed to check favorite:', error);
      return false;
    }
  }, []);

  const toggleFavorite = useCallback(async (resourceId, currentStatus) => {
    if (currentStatus) {
      return await removeFavorite(resourceId);
    } else {
      return await addFavorite(resourceId);
    }
  }, [addFavorite, removeFavorite]);

  const clearAllFavorites = useCallback(async () => {
    try {
      await api.delete('/favorites');
      await loadFavorites();
      return true;
    } catch (error) {
      console.error('Failed to clear favorites:', error);
      return false;
    }
  }, [loadFavorites]);

  return { 
    favorites, 
    loading,
    addFavorite, 
    removeFavorite,
    isFavorite,
    toggleFavorite,
    clearAllFavorites,
    loadFavorites
  };
};