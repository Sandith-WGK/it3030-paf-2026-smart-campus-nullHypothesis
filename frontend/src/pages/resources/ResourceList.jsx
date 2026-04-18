import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import resourceApi from '../../services/api/resourceApi';
import { 
  Search, Filter, MapPin, Users, Clock, Package, 
  Building2, FlaskConical, DoorOpen, Wrench,
  ChevronDown, ChevronUp, X, Calendar, CheckCircle,
  AlertCircle, LayoutGrid, List, Grid3x3
} from 'lucide-react';
import Layout from '../../components/layout/Layout';

/**
 * ResourceList - Catalogue page displaying all resources with search/filter functionality
 * Accessible to all authenticated users
 */
const ResourceList = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'compact'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    type: '',
    minCapacity: '',
    location: '',
    status: '',
  });

  // Fetch resources on component mount
  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await resourceApi.getAll();
      setResources(response.data.data || []);
    } catch (err) {
      setError('Failed to load resources. Please try again.');
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and search locally for better UX
  const filteredResources = useMemo(() => {
    let filtered = [...resources];

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(resource => 
        resource.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(resource => resource.type === filters.type);
    }

    // Apply min capacity filter
    if (filters.minCapacity) {
      filtered = filtered.filter(resource => 
        resource.capacity && resource.capacity >= parseInt(filters.minCapacity)
      );
    }

    // Apply location filter
    if (filters.location) {
      filtered = filtered.filter(resource => 
        resource.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(resource => resource.status === filters.status);
    }

    return filtered;
  }, [resources, searchQuery, filters]);

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
    setSearchQuery('');
  };

  const getStatusColor = (status) => {
    return status === 'ACTIVE' 
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
      : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
  };

  const getStatusIcon = (status) => {
    return status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />;
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'HALL': return Building2;
      case 'LAB': return FlaskConical;
      case 'ROOM': return DoorOpen;
      case 'EQUIPMENT': return Wrench;
      default: return Package;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'HALL': 
        return 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10';
      case 'LAB': 
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10';
      case 'ROOM':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10';
      case 'EQUIPMENT': 
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10';
      default: 
        return 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-500/10';
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'HALL': return 'Lecture Hall';
      case 'LAB': return 'Laboratory';
      case 'ROOM': return 'Meeting Room';
      case 'EQUIPMENT': return 'Equipment';
      default: return type;
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== '').length + (searchQuery ? 1 : 0);

  // Quick stats
  const stats = {
    total: resources.length,
    active: resources.filter(r => r.status === 'ACTIVE').length,
    types: [...new Set(resources.map(r => r.type))].length,
    totalCapacity: resources.reduce((sum, r) => sum + (r.capacity || 0), 0)
  };

  if (loading) {
    return (
      <Layout title="Browse Resources">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 dark:border-violet-400"></div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading resources...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Browse Resources">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Stats */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Facilities & Assets Catalogue
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
              Browse and search available campus resources for your bookings
            </p>
          </div>
          
          {/* Quick Stats Badges */}
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-violet-50 dark:bg-violet-500/10 rounded-lg">
              <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                {stats.total} Resources
              </span>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {stats.active} Active
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, location, type, or description..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters Section */}
        <div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-zinc-500 dark:text-zinc-400" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 mr-2 border-r border-zinc-200 dark:border-zinc-700 pr-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setViewMode('grid'); }}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' : 'text-zinc-400 hover:text-zinc-600'}`}
                  title="Grid view"
                >
                  <Grid3x3 size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setViewMode('compact'); }}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'compact' ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' : 'text-zinc-400 hover:text-zinc-600'}`}
                  title="Compact view"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          <AnimatePresence>
            {showFilters && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
              >
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Resource Type
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">All Types</option>
                      <option value="HALL">Lecture Hall</option>
                      <option value="LAB">Laboratory</option>
                      <option value="ROOM">Meeting Room</option>
                      <option value="EQUIPMENT">Equipment</option>
                    </select>
                  </div>

                  {/* Min Capacity Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Minimum Capacity
                    </label>
                    <div className="relative">
                      <Users size={16} className="absolute left-3 top-2.5 text-zinc-400" />
                      <input
                        type="number"
                        value={filters.minCapacity}
                        onChange={(e) => handleFilterChange('minCapacity', e.target.value)}
                        placeholder="e.g., 30"
                        min="0"
                        className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-2.5 text-zinc-400" />
                      <input
                        type="text"
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        placeholder="Search by building or floor..."
                        className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {activeFilterCount > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
                    >
                      <X size={14} />
                      Clear all filters ({activeFilterCount})
                    </button>
                  </div>
                )}
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <Motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Found <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filteredResources.length}</span> {filteredResources.length === 1 ? 'resource' : 'resources'}
          </p>
        </div>

        {/* Resources Grid/Compact View */}
        {filteredResources.length === 0 ? (
          <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
          >
            <Package size={48} className="mx-auto text-zinc-400 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">No resources found</p>
            <p className="text-sm text-zinc-400 mt-1">Try adjusting your filters or search criteria</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium inline-flex items-center gap-1"
            >
              <X size={14} />
              Clear all filters
            </button>
          </Motion.div>
        ) : (
          <div className={`grid gap-5 ${
            viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'
          }`}>
            {filteredResources.map((resource, index) => {
              const IconComponent = getTypeIcon(resource.type);
              const typeColorClass = getTypeColor(resource.type);
              
              return (
                <Motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  onClick={() => navigate(`/resources/${resource.id}`)}
                  className={`group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                    viewMode === 'compact' ? 'p-4' : 'p-5'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`inline-flex rounded-xl ${typeColorClass} ${viewMode === 'compact' ? 'p-1.5' : 'p-2.5'}`}>
                        <IconComponent size={viewMode === 'compact' ? 16 : 20} />
                      </div>
                      <div>
                        <h3 className={`font-semibold text-zinc-900 dark:text-zinc-100 ${viewMode === 'compact' ? 'text-sm' : 'text-base'}`}>
                          {resource.name}
                        </h3>
                        {viewMode !== 'compact' && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {getTypeLabel(resource.type)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(resource.status)}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(resource.status)} ${viewMode === 'compact' ? 'text-[10px] px-1.5' : ''}`}>
                        {resource.status === 'ACTIVE' ? 'Active' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className={`space-y-2 ${viewMode === 'compact' ? 'space-y-1.5' : ''}`}>
                    {resource.capacity && (
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Users size={viewMode === 'compact' ? 12 : 14} />
                        <span className={viewMode === 'compact' ? 'text-xs' : 'text-sm'}>
                          Capacity: {resource.capacity} {!viewMode === 'compact' && 'people'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <MapPin size={viewMode === 'compact' ? 12 : 14} />
                      <span className={viewMode === 'compact' ? 'text-xs truncate' : 'text-sm'}>
                        {resource.location}
                      </span>
                    </div>
                    {viewMode !== 'compact' && (
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Clock size={14} />
                        <span className="text-sm">{resource.availabilityStart} - {resource.availabilityEnd}</span>
                      </div>
                    )}
                  </div>

                  {/* Description (only in grid mode) */}
                  {viewMode !== 'compact' && resource.description && (
                    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      {resource.description}
                    </p>
                  )}
                </Motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ResourceList;