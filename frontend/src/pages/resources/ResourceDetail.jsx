import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import resourceApi from '../../services/api/resourceApi';
import { isAdmin } from '../../utils/auth';
import { 
  ArrowLeft, MapPin, Users, Clock, Calendar, Edit, Trash2,
  Building2, FlaskConical, DoorOpen, Wrench, AlertCircle,
  CheckCircle, XCircle, Clock as ClockIcon
} from 'lucide-react';
import Layout from '../../components/layout/Layout';

/**
 * ResourceDetail - Single resource detail view
 * Shows all resource information with admin action buttons
 */
const ResourceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const adminStatus = isAdmin();

  useEffect(() => {
    fetchResource();
  }, [id]);

  const fetchResource = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await resourceApi.getById(id);
      setResource(response.data.data);
    } catch (err) {
      setError('Failed to load resource details. Please try again.');
      console.error('Error fetching resource:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusConfig = (status) => {
    return status === 'ACTIVE' 
      ? { color: 'emerald', icon: CheckCircle, text: 'Active', bg: 'bg-emerald-50 dark:bg-emerald-500/10', textColor: 'text-emerald-700 dark:text-emerald-400' }
      : { color: 'rose', icon: XCircle, text: 'Out of Service', bg: 'bg-rose-50 dark:bg-rose-500/10', textColor: 'text-rose-700 dark:text-rose-400' };
  };

  const getTypeConfig = (type) => {
    switch(type) {
      case 'HALL': 
        return { icon: Building2, label: 'Lecture Hall', color: 'violet', bg: 'bg-violet-50 dark:bg-violet-500/10', textColor: 'text-violet-600 dark:text-violet-400' };
      case 'LAB': 
        return { icon: FlaskConical, label: 'Laboratory', color: 'indigo', bg: 'bg-indigo-50 dark:bg-indigo-500/10', textColor: 'text-indigo-600 dark:text-indigo-400' };
      case 'ROOM': 
        return { icon: DoorOpen, label: 'Meeting Room', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400' };
      case 'EQUIPMENT': 
        return { icon: Wrench, label: 'Equipment', color: 'amber', bg: 'bg-amber-50 dark:bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400' };
      default: 
        return { icon: Building2, label: 'Resource', color: 'gray', bg: 'bg-gray-50 dark:bg-gray-500/10', textColor: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const typeConfig = resource ? getTypeConfig(resource.type) : null;
  const statusConfig = resource ? getStatusConfig(resource.status) : null;
  const StatusIcon = statusConfig?.icon;

  if (loading) {
    return (
      <Layout title="Resource Details">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 dark:border-violet-400"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Error">
        <div className="max-w-4xl mx-auto">
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
        <div className="max-w-4xl mx-auto text-center py-16">
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
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/resources')}
          className="inline-flex items-center gap-2 text-zinc-600 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 transition-colors mb-6 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back to Resources</span>
        </button>

        {/* Resource Card */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
        >
          {/* Header */}
          <div className="relative overflow-hidden">
            <div className={`absolute inset-0 ${typeConfig.bg} opacity-30`} />
            <div className="relative p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`inline-flex rounded-xl p-3 ${typeConfig.bg}`}>
                    <TypeIcon size={28} className={typeConfig.textColor} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                      {resource.name}
                    </h1>
                    <div className="flex items-center gap-3">
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

                {/* Admin Actions */}
                {adminStatus && (
                  <div className="flex gap-2">
                    {!deleteConfirm ? (
                      <>
                        <button
                          onClick={() => navigate(`/admin/resources/${id}/edit`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-2 items-center bg-rose-50 dark:bg-rose-500/10 rounded-lg p-1.5">
                        <span className="text-xs text-rose-700 dark:text-rose-400 px-2">Confirm delete?</span>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium disabled:opacity-50"
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
                        >
                          <XCircle size={14} />
                          No
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="inline-flex rounded-lg p-2 bg-zinc-100 dark:bg-zinc-800">
                  <MapPin size={16} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Location
                  </h3>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {resource.location}
                  </p>
                </div>
              </div>

              {/* Capacity */}
              {resource.capacity && (
                <div className="flex items-start gap-3">
                  <div className="inline-flex rounded-lg p-2 bg-zinc-100 dark:bg-zinc-800">
                    <Users size={16} className="text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Capacity
                    </h3>
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {resource.capacity} people
                    </p>
                  </div>
                </div>
              )}

              {/* Availability */}
              <div className="flex items-start gap-3">
                <div className="inline-flex rounded-lg p-2 bg-zinc-100 dark:bg-zinc-800">
                  <Clock size={16} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Available Hours
                  </h3>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {resource.availabilityStart} - {resource.availabilityEnd}
                  </p>
                </div>
              </div>

              {/* Created Date */}
              {resource.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="inline-flex rounded-lg p-2 bg-zinc-100 dark:bg-zinc-800">
                    <Calendar size={16} className="text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Created
                    </h3>
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
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

            {/* Description */}
            {resource.description && (
              <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                  Description
                </h3>
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {resource.description}
                </p>
              </div>
            )}

            {/* Book Now Button */}
            {resource.status === 'ACTIVE' && (
              <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => navigate(`/bookings/create?resourceId=${id}`)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <ClockIcon size={18} />
                  Book This Resource
                </button>
              </div>
            )}
          </div>
        </Motion.div>
      </div>
    </Layout>
  );
};

export default ResourceDetail;