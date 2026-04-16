import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import resourceApi from '../../services/api/resourceApi';
import { Search, Filter, MapPin, Users, Clock } from 'lucide-react';

/**
 * ResourceList - Catalogue page displaying all resources with search/filter functionality
 * Accessible to all authenticated users
 */
const ResourceList = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    type: '',
    minCapacity: '',
    location: '',
    status: '',
  });

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Remove empty filters
      const activeFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== '') {
          activeFilters[key] = filters[key];
        }
      });

      const response = await resourceApi.getAll(activeFilters);
      setResources(response.data.data || []);
    } catch (err) {
      setError('Failed to load resources. Please try again.');
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      minCapacity: '',
      location: '',
      status: '',
    });
  };

  const getStatusColor = (status) => {
    return status === 'ACTIVE' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'HALL': return '🏛️';
      case 'LAB': return '🔬';
      case 'ROOM': return '🚪';
      case 'EQUIPMENT': return '🔧';
      default: return '📦';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Facilities & Assets Catalogue</h1>
        <p className="text-gray-600">Browse and search available campus resources</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="HALL">Hall</option>
              <option value="LAB">Lab</option>
              <option value="ROOM">Room</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
          </div>

          {/* Min Capacity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Capacity</label>
            <input
              type="number"
              value={filters.minCapacity}
              onChange={(e) => handleFilterChange('minCapacity', e.target.value)}
              placeholder="e.g. 30"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                placeholder="Search location..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(filters.type || filters.minCapacity || filters.location || filters.status) && (
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Resources Grid */}
      {resources.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">No resources found</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear filters and try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <div
              key={resource.id}
              onClick={() => navigate(`/resources/${resource.id}`)}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getTypeIcon(resource.type)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{resource.name}</h3>
                    <span className="text-sm text-gray-500">{resource.type}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(resource.status)}`}>
                  {resource.status === 'ACTIVE' ? 'Active' : 'Out of Service'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm text-gray-600">
                {resource.capacity && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Capacity: {resource.capacity}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{resource.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{resource.availabilityStart} - {resource.availabilityEnd}</span>
                </div>
              </div>

              {/* Description */}
              {resource.description && (
                <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                  {resource.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceList;
