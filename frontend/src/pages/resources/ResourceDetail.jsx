import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import resourceApi from '../../services/api/resourceApi';
import { isAdmin } from '../../utils/auth';
import { ArrowLeft, MapPin, Users, Clock, Calendar, Edit, Trash2 } from 'lucide-react';

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
    if (!window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }

    try {
      await resourceApi.delete(id);
      navigate('/resources');
    } catch (err) {
      setError('Failed to delete resource. Please try again.');
      console.error('Error deleting resource:', err);
    }
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

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate('/resources')}
          className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Resources
        </button>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p className="text-gray-500 text-lg">Resource not found</p>
        <button
          onClick={() => navigate('/resources')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Resources
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/resources')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Resources
      </button>

      {/* Resource Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <span className="text-5xl">{getTypeIcon(resource.type)}</span>
              <div>
                <h1 className="text-3xl font-bold mb-2">{resource.name}</h1>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {resource.type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(resource.status)}`}>
                    {resource.status === 'ACTIVE' ? 'Active' : 'Out of Service'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Actions */}
            {adminStatus && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/resources/${id}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-600 mt-1" />
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                <p className="text-lg font-semibold text-gray-900">{resource.location}</p>
              </div>
            </div>

            {/* Capacity */}
            {resource.capacity && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-gray-600 mt-1" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Capacity</h3>
                  <p className="text-lg font-semibold text-gray-900">{resource.capacity} people</p>
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-600 mt-1" />
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Available Hours</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {resource.availabilityStart} - {resource.availabilityEnd}
                </p>
              </div>
            </div>

            {/* Created Date */}
            {resource.createdAt && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-600 mt-1" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {resource.description && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{resource.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceDetail;
