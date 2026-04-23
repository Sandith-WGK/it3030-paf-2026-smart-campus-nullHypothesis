import React from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import Layout from '../components/layout/Layout';
import { Heart, MapPin, Users, Clock, Trash2, Loader2 } from 'lucide-react';

const MyFavorites = () => {
  const { favorites, loading, removeFavorite } = useFavorites();

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
      case 'HALL': return 'bg-violet-100 text-violet-700';
      case 'LAB': return 'bg-indigo-100 text-indigo-700';
      case 'ROOM': return 'bg-blue-100 text-blue-700';
      case 'EQUIPMENT': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <Layout title="My Favorites">
        <div className="flex justify-center items-center h-64">
          <Loader2 size={32} className="animate-spin text-violet-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Favorites">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className="text-red-500" size={28} />
            My Favorite Resources
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {favorites.length} resource{favorites.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <Heart size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg">No favorites yet</p>
            <p className="text-sm text-gray-400 mt-1">Click the heart icon on any resource to save it here</p>
            <Link to="/resources" className="inline-block mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
              Browse Resources
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {favorites.map((item) => (
              <div
                key={item.id}
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
                            {item.resourceType === 'HALL' ? 'Lecture Hall' :
                             item.resourceType === 'LAB' ? 'Laboratory' :
                             item.resourceType === 'ROOM' ? 'Meeting Room' : 'Equipment'}
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
                      onClick={() => removeFavorite(item.resourceId)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove from favorites"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyFavorites;