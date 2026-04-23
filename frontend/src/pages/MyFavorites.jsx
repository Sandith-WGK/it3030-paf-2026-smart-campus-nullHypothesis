import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useFavorites } from '../hooks/useFavorites';
import Layout from '../components/layout/Layout';
import { Heart, MapPin, Users, Clock, Trash2, Loader2, ArrowLeft } from 'lucide-react';

// Skeleton Component for loading state
const FavoritesSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button Skeleton */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2">
          <div className="w-9 h-9 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
          <div className="w-24 h-4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg w-48 animate-pulse" />
        </div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-32 mt-2 animate-pulse" />
      </div>

      {/* Favorite Cards Skeletons */}
      <div className="grid gap-4">
        {[...Array(3)].map((_, index) => (
          <Motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
                    <div>
                      <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded-lg w-48 animate-pulse" />
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-24 mt-1.5 animate-pulse" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded w-32 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded w-28 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded w-24 animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
              </div>
            </div>
          </Motion.div>
        ))}
      </div>
    </div>
  );
};

// Empty State Component
const EmptyFavorites = () => {
  const navigate = useNavigate();
  
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
        <Heart size={32} className="text-gray-400" />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-lg">No favorites yet</p>
      <p className="text-sm text-gray-400 mt-1">Click the heart icon on any resource to save it here</p>
      <button
        onClick={() => navigate('/resources')}
        className="inline-block mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
      >
        Browse Resources
      </button>
    </Motion.div>
  );
};

// Favorite Card Component
const FavoriteCard = ({ item, onRemove }) => {
  const getTypeIcon = (type) => {
    switch(type) {
      case 'HALL': return '🏛️';
      case 'LAB': return '🔬';
      case 'ROOM': return '🚪';
      case 'EQUIPMENT': return '🔧';
      default: return '📦';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'HALL': return 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400';
      case 'LAB': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400';
      case 'ROOM': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'EQUIPMENT': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'HALL': return 'Lecture Hall';
      case 'LAB': return 'Laboratory';
      case 'ROOM': return 'Meeting Room';
      case 'EQUIPMENT': return 'Equipment';
      default: return 'Resource';
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      layout
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <Link to={`/resources/${item.resourceId}`} className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`inline-flex rounded-lg p-2 ${getTypeColor(item.resourceType)}`}>
                <span className="text-lg">{getTypeIcon(item.resourceType)}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {item.resourceName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getTypeLabel(item.resourceType)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin size={14} />
                <span>{item.resourceLocation}</span>
              </div>
              {item.resourceCapacity && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Users size={14} />
                  <span>Capacity: {item.resourceCapacity} people</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock size={14} />
                <span>{item.resourceAvailabilityStart} - {item.resourceAvailabilityEnd}</span>
              </div>
            </div>
          </Link>

          <button
            onClick={() => onRemove(item.resourceId)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove from favorites"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </Motion.div>
  );
};

const MyFavorites = () => {
  const navigate = useNavigate();
  const { favorites, loading, removeFavorite } = useFavorites();

  const handleRemoveFavorite = async (resourceId) => {
    await removeFavorite(resourceId);
  };

  if (loading) {
    return (
      <Layout title="My Favorites">
        <div className="max-w-4xl mx-auto">
          <FavoritesSkeleton />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Favorites">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/resources')}
          className="inline-flex items-center gap-2 text-zinc-600 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 transition-colors mb-6 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back to Resources</span>
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className="text-red-500" size={28} fill="currentColor" />
            My Favorite Resources
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {favorites.length} resource{favorites.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {favorites.length === 0 ? (
          <EmptyFavorites />
        ) : (
          <AnimatePresence mode="wait">
            <div className="grid gap-4">
              {favorites.map((item) => (
                <FavoriteCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveFavorite}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </Layout>
  );
};

export default MyFavorites;