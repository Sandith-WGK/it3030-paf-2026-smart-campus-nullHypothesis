import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import resourceApi from '../../services/api/resourceApi';
import { isAdmin } from '../../utils/auth';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { useFavorites } from '../../hooks/useFavorites';
import { 
  ArrowLeft, MapPin, Users, Clock, Calendar, Edit, Trash2,
  Building2, FlaskConical, DoorOpen, Wrench, AlertCircle,
  CheckCircle, XCircle, Clock as ClockIcon, Share2, Printer,
  Copy, Check, ExternalLink, Calendar as CalendarIcon, Award,
  Heart
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import RecentlyViewed from '../../components/common/RecentlyViewed';

/**
 * ResourceDetail - Single resource detail view
 * Shows all resource information with admin action buttons
 */
const ResourceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const adminStatus = isAdmin();

  const fetchResource = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await resourceApi.getById(id);
      const resourceData = response.data.data;
      setResource(resourceData);
      addToRecentlyViewed(resourceData);
      
      // Check if resource is favorited
      const favStatus = await isFavorite(id);
      setIsFav(favStatus);
    } catch (err) {
      setError('Failed to load resource details. Please try again.');
      console.error('Error fetching resource:', err);
    } finally {
      setLoading(false);
    }
  }, [id, addToRecentlyViewed, isFavorite]);

  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    try {
      setDeleting(true);
      await resourceApi.delete(id);
      navigate('/resources');
    } catch (err) {
      setError('Failed to delete resource. Please try again.');
      console.error('Error deleting resource:', err);
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(false);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleToggleFavorite = async () => {
    if (isFav) {
      await removeFavorite(id);
      setIsFav(false);
    } else {
      await addFavorite(id);
      setIsFav(true);
    }
  };

  const getStatusConfig = (status) => {
    return status === 'ACTIVE' 
      ? { color: 'emerald', icon: CheckCircle, text: 'Active', bg: 'bg-emerald-50 dark:bg-emerald-500/10', textColor: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20' }
      : { color: 'rose', icon: XCircle, text: 'Out of Service', bg: 'bg-rose-50 dark:bg-rose-500/10', textColor: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/20' };
  };

  const getTypeConfig = (type) => {
    switch(type) {
      case 'HALL': 
        return { icon: Building2, label: 'Lecture Hall', color: 'violet', bg: 'bg-violet-50 dark:bg-violet-500/10', textColor: 'text-violet-600 dark:text-violet-400', gradient: 'from-violet-50 to-violet-100 dark:from-violet-500/10 dark:to-violet-500/5' };
      case 'LAB': 
        return { icon: FlaskConical, label: 'Laboratory', color: 'indigo', bg: 'bg-indigo-50 dark:bg-indigo-500/10', textColor: 'text-indigo-600 dark:text-indigo-400', gradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-500/10 dark:to-indigo-500/5' };
      case 'ROOM': 
        return { icon: DoorOpen, label: 'Meeting Room', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400', gradient: 'from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/5' };
      case 'EQUIPMENT': 
        return { icon: Wrench, label: 'Equipment', color: 'amber', bg: 'bg-amber-50 dark:bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-500/5' };
      default: 
        return { icon: Building2, label: 'Resource', color: 'gray', bg: 'bg-gray-50 dark:bg-gray-500/10', textColor: 'text-gray-600 dark:text-gray-400', gradient: 'from-gray-50 to-gray-100 dark:from-gray-500/10 dark:to-gray-500/5' };
    }
  };

  const typeConfig = resource ? getTypeConfig(resource.type) : null;
  const statusConfig = resource ? getStatusConfig(resource.status) : null;
  const StatusIcon = statusConfig?.icon;

  if (loading) {
    return (
      <Layout title="Resource Details">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 dark:border-violet-400"></div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading resource details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Error">
        <div className="max-w-4xl mx-auto px-4">
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 text-rose-700 dark:text-rose-400 flex items-center gap-2"
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </Motion.div>
          <button
            onClick={() => navigate('/resources')}
            className="mt-4 inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Back to Resources</span>
          </button>
        </div>
      </Layout>
    );
  }

  if (!resource) {
    return (
      <Layout title="Resource Not Found">
        <div className="max-w-4xl mx-auto text-center py-16 px-4">
          <div className="inline-flex rounded-xl p-4 bg-amber-50 dark:bg-amber-500/10 mb-4">
            <AlertCircle size={32} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">Resource not found</p>
          <button
            onClick={() => navigate('/resources')}
            className="mt-4 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
          >
            Back to Resources
          </button>
        </div>
      </Layout>
    );
  }

  const TypeIcon = typeConfig.icon;

  return (
    <Layout title={resource.name}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/resources')}
          className="inline-flex items-center gap-2 text-zinc-600 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 transition-colors mb-6 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back to Resources</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Resource Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Card */}
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
            >
              {/* Header with Gradient */}
              <div className={`relative overflow-hidden bg-gradient-to-r ${typeConfig.gradient}`}>
                <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
                  <TypeIcon size={160} />
                </div>
                <div className="relative p-6 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`inline-flex rounded-xl p-3 ${typeConfig.bg} shadow-sm`}>
                        <TypeIcon size={28} className={typeConfig.textColor} />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                          {resource.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${typeConfig.bg} ${typeConfig.textColor}`}>
                            <TypeIcon size={12} />
                            {typeConfig.label}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.textColor}`}>
                            {StatusIcon && <StatusIcon size={12} />}
                            {statusConfig.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Including Favorite */}
                    <div className="flex gap-2">
                      {/* Favorite Button */}
                      <button
                        onClick={handleToggleFavorite}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
                          isFav 
                            ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20' 
                            : 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                        }`}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
                        <span className="hidden sm:inline">{isFav ? 'Favorited' : 'Favorite'}</span>
                      </button>
                      
                      <button
                        onClick={handleShare}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-sm font-medium"
                        title="Copy link"
                      >
                        {copied ? <Check size={14} /> : <Share2 size={14} />}
                        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
                      </button>
                      <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-sm font-medium"
                        title="Print details"
                      >
                        <Printer size={14} />
                        <span className="hidden sm:inline">Print</span>
                      </button>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {adminStatus && (
                    <div className="mt-4 flex justify-end">
                      <div className="flex gap-2">
                        {!deleteConfirm ? (
                          <>
                            <button
                              onClick={() => navigate(`/admin/resources/${id}/edit`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all text-sm font-medium shadow-sm"
                            >
                              <Edit size={14} />
                              Edit Resource
                            </button>
                            <button
                              onClick={handleDelete}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-medium"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </>
                        ) : (
                          <div className="flex gap-2 items-center bg-rose-50 dark:bg-rose-500/10 rounded-lg p-1.5 animate-in fade-in duration-200">
                            <span className="text-xs text-rose-700 dark:text-rose-400 px-2">Confirm delete?</span>
                            <button
                              onClick={handleDelete}
                              disabled={deleting}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-medium disabled:opacity-50"
                            >
                              {deleting ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={14} />
                                  Yes
                                </>
                              )}
                            </button>
                            <button
                              onClick={cancelDelete}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-sm font-medium"
                            >
                              <XCircle size={14} />
                              No
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Section */}
              <div className="p-6">
                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location Card */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                    <div className="inline-flex rounded-lg p-2 bg-white dark:bg-zinc-800 shadow-sm group-hover:scale-110 transition-transform">
                      <MapPin size={16} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Location
                      </h3>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                        {resource.location}
                      </p>
                    </div>
                  </div>

                  {/* Capacity Card */}
                  {resource.capacity && (
                    <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                      <div className="inline-flex rounded-lg p-2 bg-white dark:bg-zinc-800 shadow-sm group-hover:scale-110 transition-transform">
                        <Users size={16} className="text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Capacity
                        </h3>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                          Up to {resource.capacity} people
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Hours Card */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                    <div className="inline-flex rounded-lg p-2 bg-white dark:bg-zinc-800 shadow-sm group-hover:scale-110 transition-transform">
                      <Clock size={16} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Operating Hours
                      </h3>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                        {resource.availabilityStart} - {resource.availabilityEnd}
                      </p>
                    </div>
                  </div>

                  {/* Created Date Card */}
                  {resource.createdAt && (
                    <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                      <div className="inline-flex rounded-lg p-2 bg-white dark:bg-zinc-800 shadow-sm group-hover:scale-110 transition-transform">
                        <Calendar size={16} className="text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Added to System
                        </h3>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                          {new Date(resource.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description Section */}
                {resource.description && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-4 w-1 bg-violet-500 rounded-full"></div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Description
                      </h3>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                      <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {resource.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Booking Section */}
                {resource.status === 'ACTIVE' ? (
                  <div className="mt-8">
                    <button
                      onClick={() => navigate(`/bookings/new?resourceId=${id}`)}
                      className="group w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-600/20"
                    >
                      <ClockIcon size={18} className="group-hover:animate-pulse" />
                      Book This Resource
                      <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20 text-center">
                    <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                    <p className="text-amber-700 dark:text-amber-400 font-medium">
                      This resource is currently out of service
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                      Please check back later or contact administration
                    </p>
                  </div>
                )}
              </div>
            </Motion.div>
          </div>

          {/* Sidebar - Recently Viewed */}
          <div className="lg:col-span-1">
            <RecentlyViewed />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResourceDetail;