import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import resourceApi from '../../services/api/resourceApi';
import { 
  ArrowLeft, Save, X, Building2, FlaskConical, 
  DoorOpen, Wrench, Clock, MapPin, Users, FileText,
  CheckCircle, AlertCircle
} from 'lucide-react';
import Layout from '../../components/layout/Layout';

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
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchResource = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    if (isEditMode) {
      fetchResource();
    }
  }, [isEditMode, fetchResource]);

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
    setSubmitSuccess(false);

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

      setSubmitSuccess(true);
      
      // Redirect after showing success message
      setTimeout(() => {
        navigate('/admin/resources');
      }, 1500);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save resource. Please try again.');
      console.error('Error saving resource:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'HALL': return Building2;
      case 'LAB': return FlaskConical;
      case 'ROOM': return DoorOpen;
      case 'EQUIPMENT': return Wrench;
      default: return Building2;
    }
  };

  const TypeIcon = getTypeIcon(formData.type);

  if (fetchLoading) {
    return (
      <Layout title={isEditMode ? "Edit Resource" : "Create Resource"}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 dark:border-violet-400"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isEditMode ? "Edit Resource" : "Create Resource"}>
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/resources')}
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 transition-colors mb-4 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Back to Resources</span>
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {isEditMode ? 'Edit Resource' : 'Create New Resource'}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
                {isEditMode 
                  ? 'Update resource information and availability settings'
                  : 'Add a new facility or asset to the campus catalogue'}
              </p>
            </div>
            <div className={`inline-flex rounded-xl p-3 ${formData.type === 'HALL' ? 'bg-violet-50 dark:bg-violet-500/10' : 
              formData.type === 'LAB' ? 'bg-indigo-50 dark:bg-indigo-500/10' :
              formData.type === 'ROOM' ? 'bg-blue-50 dark:bg-blue-500/10' :
              'bg-amber-50 dark:bg-amber-500/10'}`}>
              <TypeIcon size={24} className={formData.type === 'HALL' ? 'text-violet-600 dark:text-violet-400' : 
                formData.type === 'LAB' ? 'text-indigo-600 dark:text-indigo-400' :
                formData.type === 'ROOM' ? 'text-blue-600 dark:text-blue-400' :
                'text-amber-600 dark:text-amber-400'} />
            </div>
          </div>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
          >
            <CheckCircle size={18} />
            <span>Resource {isEditMode ? 'updated' : 'created'} successfully! Redirecting...</span>
          </Motion.div>
        )}

        {/* Submit Error */}
        {submitError && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400 flex items-center gap-2"
          >
            <AlertCircle size={18} />
            <span>{submitError}</span>
          </Motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  Basic Information
                </h2>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Resource Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 transition-colors ${
                        errors.name ? 'border-rose-500 dark:border-rose-500' : 'border-zinc-300 dark:border-zinc-700'
                      }`}
                      placeholder="e.g., Main Auditorium, Computer Lab A"
                    />
                    {errors.name && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.name}</p>}
                  </div>

                  {/* Type & Status Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Type */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Resource Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="HALL">Lecture Hall</option>
                        <option value="LAB">Laboratory</option>
                        <option value="ROOM">Meeting Room</option>
                        <option value="EQUIPMENT">Equipment</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="OUT_OF_SERVICE">Out of Service</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Capacity Section */}
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  Location & Capacity
                </h2>
                <div className="space-y-4">
                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        Location <span className="text-rose-500">*</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 ${
                        errors.location ? 'border-rose-500 dark:border-rose-500' : 'border-zinc-300 dark:border-zinc-700'
                      }`}
                      placeholder="e.g., Block A, Level 2, Room 201"
                    />
                    {errors.location && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.location}</p>}
                  </div>

                  {/* Capacity (conditional) */}
                  {formData.type !== 'EQUIPMENT' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        <div className="flex items-center gap-2">
                          <Users size={16} />
                          Capacity <span className="text-rose-500">*</span>
                        </div>
                      </label>
                      <input
                        type="number"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleChange}
                        min="1"
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 ${
                          errors.capacity ? 'border-rose-500 dark:border-rose-500' : 'border-zinc-300 dark:border-zinc-700'
                        }`}
                        placeholder="Number of people"
                      />
                      {errors.capacity && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.capacity}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Availability Schedule Section */}
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    Availability Schedule
                  </div>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="availabilityStart"
                      value={formData.availabilityStart}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="availabilityEnd"
                      value={formData.availabilityEnd}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 ${
                        errors.availabilityEnd ? 'border-rose-500 dark:border-rose-500' : 'border-zinc-300 dark:border-zinc-700'
                      }`}
                    />
                    {errors.availabilityEnd && (
                      <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.availabilityEnd}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <FileText size={18} />
                    Additional Details
                  </div>
                </h2>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 resize-none"
                    placeholder="Provide additional information about this resource (features, restrictions, special instructions, etc.)..."
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>{isEditMode ? 'Update Resource' : 'Create Resource'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/resources')}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold py-2.5 px-4 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            </div>
          </Motion.div>
        </form>
      </div>
    </Layout>
  );
};

export default ResourceForm;