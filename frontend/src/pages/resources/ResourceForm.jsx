import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import resourceApi from '../../services/api/resourceApi';
import { ArrowLeft } from 'lucide-react';

/**
 * ResourceForm - Create/Edit form for resources
 * Includes validation for required fields and business rules
 */
const ResourceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'ROOM',
    capacity: '',
    location: '',
    status: 'ACTIVE',
    availabilityStart: '08:00',
    availabilityEnd: '20:00',
    description: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Fetch resource data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      fetchResource();
    }
  }, [id]);

  const fetchResource = async () => {
    try {
      setFetchLoading(true);
      const response = await resourceApi.getById(id);
      const resource = response.data.data;
      
      setFormData({
        name: resource.name || '',
        type: resource.type || 'ROOM',
        capacity: resource.capacity || '',
        location: resource.location || '',
        status: resource.status || 'ACTIVE',
        availabilityStart: resource.availabilityStart || '08:00',
        availabilityEnd: resource.availabilityEnd || '20:00',
        description: resource.description || '',
      });
    } catch (err) {
      setSubmitError('Failed to load resource data.');
      console.error('Error fetching resource:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Resource name is required';
    }

    // Location validation
    if (!formData.location || formData.location.trim() === '') {
      newErrors.location = 'Location is required';
    }

    // Capacity validation (required for HALL, LAB, ROOM)
    if (formData.type !== 'EQUIPMENT') {
      if (!formData.capacity || formData.capacity <= 0) {
        newErrors.capacity = 'Capacity must be a positive number';
      }
    }

    // Availability time validation
    if (formData.availabilityStart && formData.availabilityEnd) {
      if (formData.availabilityStart >= formData.availabilityEnd) {
        newErrors.availabilityEnd = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Prepare data for submission
      const submitData = {
        ...formData,
        capacity: formData.type !== 'EQUIPMENT' ? parseInt(formData.capacity) : null,
      };

      if (isEditMode) {
        await resourceApi.update(id, submitData);
      } else {
        await resourceApi.create(submitData);
      }

      navigate('/admin/resources');
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save resource. Please try again.');
      console.error('Error saving resource:', err);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/resources')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Resources
      </button>

      {/* Form Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEditMode ? 'Edit Resource' : 'Create New Resource'}
        </h1>
        <p className="text-gray-600">
          {isEditMode ? 'Update resource information' : 'Add a new facility or asset to the catalogue'}
        </p>
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {submitError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g. Main Auditorium"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="HALL">Hall</option>
              <option value="LAB">Lab</option>
              <option value="ROOM">Room</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
          </div>

          {/* Capacity */}
          {formData.type !== 'EQUIPMENT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.capacity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g. 50"
              />
              {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>}
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g. Block A, Level 2"
            />
            {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>

          {/* Availability Times */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability Start
              </label>
              <input
                type="time"
                name="availabilityStart"
                value={formData.availabilityStart}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability End
              </label>
              <input
                type="time"
                name="availabilityEnd"
                value={formData.availabilityEnd}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.availabilityEnd ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.availabilityEnd && (
                <p className="mt-1 text-sm text-red-600">{errors.availabilityEnd}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional details about the resource..."
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Resource' : 'Create Resource')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/resources')}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResourceForm;
