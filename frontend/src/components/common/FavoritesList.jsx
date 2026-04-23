import React from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../../hooks/useFavorites';
import { Heart, Trash2, Loader2, X, ArrowRight } from 'lucide-react';

const FavoritesList = () => {
  const { favorites, loading, removeFavorite, clearAllFavorites } = useFavorites();
  
  // Show only first 3 favorites
  const displayFavorites = favorites.slice(0, 3);
  const hasMore = favorites.length > 3;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 text-center">
        <Loader2 size={20} className="animate-spin mx-auto text-gray-400" />
        <p className="text-xs text-gray-400 mt-2">Loading favorites...</p>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
          <Heart size={20} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">No favorite resources</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click the heart icon to save resources</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-red-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Favorites</h3>
          <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            {favorites.length}
          </span>
        </div>
        <button
          onClick={clearAllFavorites}
          className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
        >
          <Trash2 size={12} /> Clear all
        </button>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {displayFavorites.map((item, index) => (
          <Link
            key={item.id}
            to={`/resources/${item.resourceId}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          >
            <div className="w-5">
              <span className="text-xs font-medium text-gray-400 group-hover:text-gray-500">{index + 1}</span>
            </div>
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <Heart size={14} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.resourceName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.resourceType} • {item.resourceLocation}</p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeFavorite(item.resourceId);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
              title="Remove from favorites"
            >
              <X size={14} />
            </button>
          </Link>
        ))}
      </div>

      {/* View All Link - Shows when there are more than 3 favorites */}
      {hasMore && (
        <Link
          to="/my-favorites"
          className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-100 dark:border-gray-700"
        >
          <span className="text-xs text-gray-500 dark:text-gray-400">
            + {favorites.length - 3} more favorite{favorites.length - 3 !== 1 ? 's' : ''}
          </span>
          <span className="text-xs font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1">
            View all <ArrowRight size={12} />
          </span>
        </Link>
      )}

      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Personal - only visible to your account
        </p>
      </div>
    </div>
  );
};

export default FavoritesList;