import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import resourceApi from '../../services/api/resourceApi';
import { 
  Plus, Download, Upload, Edit, Trash2, X, 
  Building2, FlaskConical, DoorOpen, Wrench,
  ChevronLeft, ChevronRight, AlertCircle,
  CheckCircle, Search, Filter
} from 'lucide-react';
import Layout from '../../components/layout/Layout';

/**
 * AdminResources - Admin management page for resources
 * Includes table view, CRUD operations, and import/export functionality
 */
const AdminResources = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const handleDelete = async (id) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      await resourceApi.delete(id);
      setDeleteConfirm(null);
      fetchResources();
    } catch (err) {
      setError('Failed to delete resource. Please try again.');
      console.error('Error deleting resource:', err);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await resourceApi.exportResources();
    } catch (err) {
      setError('Failed to export resources. Please try again.');
      console.error('Error exporting resources:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setError('Please select a file to import');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      const response = await resourceApi.importResources(importFile);
      alert(response.data?.message || 'Import successful!');
      setShowImportModal(false);
      setImportFile(null);
      fetchResources();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import resources. Please try again.');
      console.error('Error importing resources:', err);
    } finally {
      setImporting(false);
    }
  };

  const getStatusConfig = (status) => {
    return status === 'ACTIVE' 
      ? { color: 'emerald', text: 'Active', bg: 'bg-emerald-50 dark:bg-emerald-500/10', textColor: 'text-emerald-700 dark:text-emerald-400' }
      : { color: 'rose', text: 'Out of Service', bg: 'bg-rose-50 dark:bg-rose-500/10', textColor: 'text-rose-700 dark:text-rose-400' };
  };

  const getTypeConfig = (type) => {
    switch(type) {
      case 'HALL': 
        return { icon: Building2, label: 'Hall', color: 'violet', bg: 'bg-violet-50 dark:bg-violet-500/10', textColor: 'text-violet-600 dark:text-violet-400' };
      case 'LAB': 
        return { icon: FlaskConical, label: 'Lab', color: 'indigo', bg: 'bg-indigo-50 dark:bg-indigo-500/10', textColor: 'text-indigo-600 dark:text-indigo-400' };
      case 'ROOM': 
        return { icon: DoorOpen, label: 'Room', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400' };
      case 'EQUIPMENT': 
        return { icon: Wrench, label: 'Equipment', color: 'amber', bg: 'bg-amber-50 dark:bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400' };
      default: 
        return { icon: Building2, label: 'Resource', color: 'gray', bg: 'bg-gray-50 dark:bg-gray-500/10', textColor: 'text-gray-600 dark:text-gray-400' };
    }
  };

  // Filter resources
  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          resource.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || resource.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || resource.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <Layout title="Resource Management">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 dark:border-violet-400"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Resource Management">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Resource Management
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            Manage campus facilities, labs, rooms, and equipment
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg p-1 transition-colors">
              <X size={16} />
            </button>
          </Motion.div>
        )}

        {/* Action Bar */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/admin/resources/new')}
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Add Resource
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              <Upload size={16} />
              Import CSV
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 mb-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 text-sm"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 text-sm"
            >
              <option value="ALL">All Types</option>
              <option value="HALL">Lecture Halls</option>
              <option value="LAB">Laboratories</option>
              <option value="ROOM">Meeting Rooms</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>
        </div>

        {/* Resources Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="inline-flex rounded-xl p-3 bg-zinc-100 dark:bg-zinc-800 mb-3">
                        <Building2 size={24} className="text-zinc-400" />
                      </div>
                      <p className="text-zinc-500 dark:text-zinc-400">No resources found</p>
                      {(searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setTypeFilter('ALL');
                            setStatusFilter('ALL');
                          }}
                          className="mt-2 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredResources.map((resource, index) => {
                    const typeConfig = getTypeConfig(resource.type);
                    const statusConfig = getStatusConfig(resource.status);
                    const TypeIcon = typeConfig.icon;
                    
                    return (
                      <Motion.tr
                        key={resource.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`inline-flex rounded-lg p-1.5 ${typeConfig.bg}`}>
                              <TypeIcon size={14} className={typeConfig.textColor} />
                            </div>
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {resource.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            {typeConfig.label}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            {resource.capacity || 'N/A'}
                            {resource.capacity && ' people'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            {resource.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.bg} ${statusConfig.textColor}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {statusConfig.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            {resource.availabilityStart} - {resource.availabilityEnd}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {deleteConfirm === resource.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleDelete(resource.id)}
                                className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-medium hover:bg-rose-700 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={cancelDelete}
                                className="px-2 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => navigate(`/admin/resources/${resource.id}/edit`)}
                                className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(resource.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </Motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          {filteredResources.length > 0 && (
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Showing {filteredResources.length} of {resources.length} resources
                </span>
                <div className="flex gap-2">
                  <button className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50">
                    <ChevronLeft size={16} />
                  </button>
                  <button className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Import Resources from CSV
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 text-sm"
              />
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>CSV Format:</strong> name, type, capacity, location, status, availabilityStart, availabilityEnd, description
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="flex-1 bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors font-medium"
              >
                {importing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Importing...
                  </div>
                ) : (
                  'Import'
                )}
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="flex-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 py-2 px-4 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </Layout>
  );
};

export default AdminResources;