import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import resourceApi from '../../services/api/resourceApi';
import { 
  Search, Filter, MapPin, Users, Clock, Package, 
  Building2, FlaskConical, DoorOpen, Wrench,
  ChevronDown, ChevronUp, X, CheckCircle,
  AlertCircle, LayoutGrid, Grid3x3, Eye, 
  TrendingUp, Sparkles, ArrowRight, Clock as ClockIcon,
  Star, Zap, Heart
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import FavoritesList from '../../components/common/FavoritesList';

// Constants for resource types
const RESOURCE_TYPES = {
  HALL: { label: 'Lecture Hall', icon: Building2, color: 'violet' },
  LAB: { label: 'Laboratory', icon: FlaskConical, color: 'indigo' },
  ROOM: { label: 'Meeting Room', icon: DoorOpen, color: 'blue' },
  EQUIPMENT: { label: 'Equipment', icon: Wrench, color: 'amber' }
};

// Helper functions
const getResourceTypeConfig = (type) => {
  return RESOURCE_TYPES[type] || { label: type, icon: Package, color: 'zinc' };
};

const getStatusConfig = (status) => {
  return status === 'ACTIVE' 
    ? { label: 'Active', color: 'emerald', icon: CheckCircle }
    : { label: 'Offline', color: 'rose', icon: AlertCircle };
};

// Recently Viewed Hook
const useRecentlyViewed = () => {
  const STORAGE_KEY = 'recently_viewed_resources';
  const MAX_ITEMS = 5;

  const [recentItems, setRecentItems] = useState([]);

  useEffect(() => {
    const loadRecentItems = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setRecentItems(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse recently viewed:', e);
        }
      }
    };
    loadRecentItems();
  }, []);

  const addToRecentlyViewed = (resource) => {
    setRecentItems(prev => {
      const filtered = prev.filter(item => item.id !== resource.id);
      const newItems = [resource, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      return newItems;
    });
  };

  const clearRecentlyViewed = () => {
    setRecentItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { recentItems, addToRecentlyViewed, clearRecentlyViewed };
};

// Resource Card Component
const ResourceCard = ({ resource, viewMode, onClick }) => {
  const typeConfig = getResourceTypeConfig(resource.type);
  const IconComponent = typeConfig.icon;
  const statusConfig = getStatusConfig(resource.status);
  const StatusIcon = statusConfig.icon;
  const isCompact = viewMode === 'compact';

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all cursor-pointer ${
        isCompact ? 'p-4' : 'p-5'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`inline-flex rounded-xl p-${isCompact ? '1.5' : '2.5'} shrink-0 bg-${typeConfig.color}-50 dark:bg-${typeConfig.color}-500/10 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`}>
            <IconComponent size={isCompact ? 16 : 20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-zinc-900 dark:text-zinc-100 ${isCompact ? 'text-sm' : 'text-base'} truncate`}>
              {resource.name}
            </h3>
            {!isCompact && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {typeConfig.label}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <StatusIcon size={12} className={`text-${statusConfig.color}-500`} />
          <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${statusConfig.color}-50 text-${statusConfig.color}-700 dark:bg-${statusConfig.color}-500/10 dark:text-${statusConfig.color}-400 ${isCompact ? 'text-[10px] px-1.5' : ''}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className={`space-y-2 ${isCompact ? 'space-y-1.5' : ''}`}>
        {resource.capacity && (
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Users size={isCompact ? 12 : 14} />
            <span className={isCompact ? 'text-xs' : 'text-sm'}>
              Capacity: {resource.capacity}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <MapPin size={isCompact ? 12 : 14} />
          <span className={`${isCompact ? 'text-xs' : 'text-sm'} truncate`}>
            {resource.location}
          </span>
        </div>
        {!isCompact && (
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Clock size={14} />
            <span className="text-sm">{resource.availabilityStart} - {resource.availabilityEnd}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {!isCompact && resource.description && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {resource.description}
        </p>
      )}

      {/* Hover indicator */}
      <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-violet-600 dark:text-violet-400 inline-flex items-center gap-1">
          View details <ArrowRight size={12} />
        </span>
      </div>
    </Motion.div>
  );
};

// Recently Viewed Component
const RecentlyViewedComponent = ({ items, onItemClick, onClear }) => {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-violet-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Recently Viewed</h3>
          </div>
        </div>
        <div className="p-8 text-center">
          <Eye size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No recently viewed items</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Resources you view will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden sticky top-6">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-violet-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Recently Viewed</h3>
          </div>
          <button
            onClick={onClear}
            className="text-xs text-zinc-400 hover:text-rose-500 transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
        {items.map((item, index) => {
          const typeConfig = getResourceTypeConfig(item.type);
          const IconComponent = typeConfig.icon;
          
          return (
            <Motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onItemClick(item.id)}
              className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className={`inline-flex rounded-lg p-2 bg-${typeConfig.color}-50 dark:bg-${typeConfig.color}-500/10 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`}>
                  <IconComponent size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {typeConfig.label}
                    </span>
                    <span className="text-xs text-zinc-400">•</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {item.location}
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </Motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Stats Cards Component
const StatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="px-3 py-2 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-500/10 dark:to-violet-500/5 rounded-lg">
        <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Total</p>
        <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{stats.total}</p>
        <p className="text-[10px] text-violet-500 dark:text-violet-400">Resources</p>
      </div>
      <div className="px-3 py-2 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/5 rounded-lg">
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active</p>
        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</p>
        <p className="text-[10px] text-emerald-500 dark:text-emerald-400">{Math.round((stats.active / stats.total) * 100) || 0}% rate</p>
      </div>
    </div>
  );
};

// Filter Chips Component
const FilterChips = ({ filters, onRemove, onClearAll }) => {
  const chips = [];
  
  if (filters.type) {
    chips.push({ key: 'type', label: RESOURCE_TYPES[filters.type]?.label });
  }
  if (filters.minCapacity) {
    chips.push({ key: 'minCapacity', label: `Capacity ≥ ${filters.minCapacity}` });
  }
  if (filters.location) {
    chips.push({ key: 'location', label: filters.location });
  }
  if (filters.status) {
    chips.push({ key: 'status', label: filters.status === 'ACTIVE' ? 'Active' : 'Out of Service' });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
      <span className="text-xs text-zinc-500">Active filters:</span>
      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 rounded-lg"
        >
          {chip.label}
          <button
            onClick={() => onRemove(chip.key)}
            className="hover:text-violet-900 dark:hover:text-violet-300"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 ml-auto"
      >
        Clear all
      </button>
    </div>
  );
};

// Main Component
const ResourceList = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    minCapacity: '',
    location: '',
    status: '',
  });
  
  const { recentItems, addToRecentlyViewed, clearRecentlyViewed } = useRecentlyViewed();

  // Fetch resources
  useEffect(() => {
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
    fetchResources();
  }, []);

  // Filter resources
  const filteredResources = useMemo(() => {
    let filtered = [...resources];

    if (searchQuery) {
      filtered = filtered.filter(resource => 
        resource.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.type) {
      filtered = filtered.filter(resource => resource.type === filters.type);
    }

    if (filters.minCapacity) {
      filtered = filtered.filter(resource => 
        resource.capacity && resource.capacity >= parseInt(filters.minCapacity)
      );
    }

    if (filters.location) {
      filtered = filtered.filter(resource => 
        resource.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(resource => resource.status === filters.status);
    }

    return filtered;
  }, [resources, searchQuery, filters]);

  const handleResourceClick = (resource) => {
    addToRecentlyViewed(resource);
    navigate(`/resources/${resource.id}`);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const removeFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
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

  const activeFilterCount = Object.values(filters).filter(v => v && v !== '').length + (searchQuery ? 1 : 0);

  const stats = {
    total: resources.length,
    active: resources.filter(r => r.status === 'ACTIVE').length,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-2xl p-6 border border-violet-100 dark:border-violet-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Facilities & Assets Catalogue
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm max-w-md">
                    Browse and book campus resources for your academic and extracurricular activities
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <Sparkles size={14} className="text-violet-500" />
                    <span className="text-xs text-violet-600 dark:text-violet-400">
                      {stats.total} resources available
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <Zap size={48} className="text-violet-300 dark:text-violet-600" />
                </div>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="space-y-3">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, location, type, or description..."
                  className="w-full pl-11 pr-24 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                      showFilters || activeFilterCount > 0
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    <Filter size={14} />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-violet-500 text-white rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-400'}`}
                      title="Grid view"
                    >
                      <Grid3x3 size={14} />
                    </button>
                    <button
                      onClick={() => setViewMode('compact')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'compact' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-400'}`}
                      title="Compact view"
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Chips */}
              <FilterChips 
                filters={filters}
                onRemove={removeFilter}
                onClearAll={clearFilters}
              />
            </div>

            {/* Expandable Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <Motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                          {Object.entries(RESOURCE_TYPES).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                          ))}
                        </select>
                      </div>

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
                            placeholder="Search by building..."
                            className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                        </div>
                      </div>

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
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>

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

            {/* Results Header */}
            <div className="flex justify-between items-center pb-2">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Found <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filteredResources.length}</span> {filteredResources.length === 1 ? 'resource' : 'resources'}
              </p>
              {searchQuery && (
                <p className="text-xs text-zinc-400">
                  Showing results for "{searchQuery}"
                </p>
              )}
            </div>

            {/* Resources Grid */}
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
                  className="mt-4 text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium inline-flex items-center gap-1"
                >
                  <X size={14} />
                  Clear all filters
                </button>
              </Motion.div>
            ) : (
              <div className={`grid gap-5 ${
                viewMode === 'grid' ? 'md:grid-cols-2' : 'md:grid-cols-3'
              }`}>
                {filteredResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    viewMode={viewMode}
                    onClick={() => handleResourceClick(resource)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats Overview */}
            <div className="hidden lg:block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-violet-500" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Overview</h3>
              </div>
              <StatsCards stats={stats} />
            </div>

            {/* My Favorites Quick Link - NEW */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} className="text-red-500" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Quick Links</h3>
              </div>
              <Link
                to="/my-favorites"
                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Heart size={16} className="text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">My Favorites</span>
                </div>
                <ArrowRight size={14} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Favorites List */}
            <FavoritesList />

            {/* Recently Viewed */}
            <RecentlyViewedComponent 
              items={recentItems}
              onItemClick={(id) => {
                const resource = resources.find(r => r.id === id);
                if (resource) handleResourceClick(resource);
              }}
              onClear={clearRecentlyViewed}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResourceList;