import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import resourceApi from '../../services/api/resourceApi';
import { 
  Plus, Download, Upload, Edit, Trash2, X, 
  Building2, FlaskConical, DoorOpen, Wrench,
  ChevronLeft, ChevronRight, AlertCircle,
  Search, Loader2, CheckCircle, Power, PowerOff
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Toast from '../../components/common/Toast';
import ConfirmModal from '../../components/common/ConfirmModal';

/**
 * Skeleton loader for table rows
 */
const TableSkeleton = () => (
  <div className="animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex-1">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-32"></div>
        </div>
        <div className="flex-1">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-20"></div>
        </div>
        <div className="flex-1">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-16"></div>
        </div>
        <div className="flex-1">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-28"></div>
        </div>
        <div className="flex-1">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-16"></div>
        </div>
        <div className="flex-1">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-20"></div>
        </div>
        <div className="w-32 flex justify-end gap-2">
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Empty state component
 */
const EmptyState = ({ hasFilters, onClearFilters, onAddResource }) => (
  <div className="text-center py-12">
    <div className="inline-flex rounded-xl p-4 bg-zinc-100 dark:bg-zinc-800 mb-4">
      <Building2 size={32} className="text-zinc-400" />
    </div>
    <p className="text-zinc-500 dark:text-zinc-400 text-lg font-medium mb-2">
      {hasFilters ? 'No matching resources' : 'No resources yet'}
    </p>
    <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-4">
      {hasFilters 
        ? 'Try adjusting your search or filter criteria'
        : 'Get started by adding your first resource'}
    </p>
    {hasFilters ? (
      <button
        onClick={onClearFilters}
        className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium"
      >
        Clear all filters
      </button>
    ) : (
      <button
        onClick={onAddResource}
        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
      >
        <Plus size={16} />
        Add Resource
      </button>
    )}
  </div>
);

/**
 * AdminResources - Admin management page for resources
 * Includes table view, CRUD operations, import/export, and direct status toggle
 */
const AdminResources = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Status toggle loading states
  const [togglingStatus, setTogglingStatus] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const response = await resourceApi.getAll();
      setResources(response.data?.data || response.data || []);
    } catch {
      setToast({ type: 'error', message: 'Failed to load resources' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Handle direct status toggle
  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'OUT_OF_SERVICE' : 'ACTIVE';
    
    setTogglingStatus(id);
    try {
      await resourceApi.updateStatus(id, newStatus);
      setToast({ 
        type: 'success', 
        message: `Resource status changed to ${newStatus === 'ACTIVE' ? 'Active' : 'Out of Service'}` 
      });
      fetchResources(); // Refresh the list
    } catch {
      setToast({ type: 'error', message: 'Failed to update resource status' });
    } finally {
      setTogglingStatus(null);
    }
  };

  // Handle delete
  const handleDeleteClick = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleting(true);
    try {
      await resourceApi.delete(deleteTarget);
      setToast({ type: 'success', message: 'Resource deleted successfully!' });
      setDeleteTarget(null);
      fetchResources();
    } catch {
      setToast({ type: 'error', message: 'Failed to delete resource' });
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  // Handle export
  const handleExport = async () => {
    try {
      setExporting(true);
      await resourceApi.exportResources();
      setToast({ type: 'success', message: 'Resources exported successfully!' });
    } catch {
      setToast({ type: 'error', message: 'Failed to export resources' });
    } finally {
      setExporting(false);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      setToast({ type: 'error', message: 'Please select a file to import' });
      return;
    }

    try {
      setImporting(true);
      const response = await resourceApi.importResources(importFile);
      setToast({ type: 'success', message: response.data?.message || 'Import successful!' });
      setShowImportModal(false);
      setImportFile(null);
      fetchResources();
    } catch {
      setToast({ type: 'error', message: 'Failed to import resources' });
    } finally {
      setImporting(false);
    }
  };

  // Get status config
  const getStatusConfig = (status) => {
    return status === 'ACTIVE' 
      ? { color: 'emerald', text: 'Active', bg: 'bg-emerald-50 dark:bg-emerald-500/10', textColor: 'text-emerald-700 dark:text-emerald-400' }
      : { color: 'rose', text: 'Out of Service', bg: 'bg-rose-50 dark:bg-rose-500/10', textColor: 'text-rose-700 dark:text-rose-400' };
  };

  // Get type config
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
    const matchesSearch = resource.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          resource.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || resource.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || resource.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasFilters = searchTerm !== '' || typeFilter !== 'ALL' || statusFilter !== 'ALL';

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

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
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-zinc-800 dark:text-zinc-100 text-sm"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
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
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
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
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-0">
                      <TableSkeleton />
                    </td>
                  </tr>
                ) : paginatedResources.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12">
                      <EmptyState 
                        hasFilters={hasFilters}
                        onClearFilters={clearFilters}
                        onAddResource={() => navigate('/admin/resources/new')}
                      />
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="wait">
                    {paginatedResources.map((resource, index) => {
                      const typeConfig = getTypeConfig(resource.type);
                      const statusConfig = getStatusConfig(resource.status);
                      const TypeIcon = typeConfig.icon;
                      const isToggling = togglingStatus === resource.id;
                      
                      return (
                        <Motion.tr
                          key={resource.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.03, duration: 0.2 }}
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
                            {/* Status Toggle Button - Direct update without edit form */}
                            <button
                              onClick={() => handleStatusToggle(resource.id, resource.status)}
                              disabled={isToggling}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full transition-all ${
                                resource.status === 'ACTIVE' 
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20' 
                                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {isToggling ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : resource.status === 'ACTIVE' ? (
                                <Power size={12} />
                              ) : (
                                <PowerOff size={12} />
                              )}
                              <span>{statusConfig.text}</span>
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                              {resource.availabilityStart} - {resource.availabilityEnd}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => navigate(`/admin/resources/${resource.id}/edit`)}
                                className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(resource.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </Motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer with Pagination */}
          {!loading && filteredResources.length > 0 && (
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredResources.length)} of {filteredResources.length} resources
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1 text-zinc-600 dark:text-zinc-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowImportModal(false);
              setImportFile(null);
            }}
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
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
                <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-500/10 rounded-lg">
                  <p className="text-xs text-violet-700 dark:text-violet-400">
                    <strong>CSV Format:</strong> name, type, capacity, location, status, availabilityStart, availabilityEnd, description
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex-1 bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {importing ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
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
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Resource"
        message="Are you sure you want to delete this resource? This action cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
        loading={deleting}
      />

      {/* Toast Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
};

export default AdminResources;