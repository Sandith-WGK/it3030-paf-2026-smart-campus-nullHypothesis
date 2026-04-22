import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ticketService } from '../../services/api/ticketService';
import Toast from '../../components/common/Toast';

export default function CreateTicketForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    category: 'MAINTENANCE',
    description: '',
    priority: 'LOW',
    contactDetails: ''
  });

  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 3) {
      setToast({ type: 'error', message: 'Maximum 3 files allowed' });
      return;
    }
    setFiles([...files, ...selected]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description) {
      setToast({ type: 'error', message: 'Description is required' });
      return;
    }
    setLoading(true);

    try {
      // 1. Create the ticket payload
      const res = await ticketService.createTicket(formData);

      // Log the response to see where the ID is
      console.log("Ticket Creation Response:", res);

      const ticketId = res.data?.id || res.id;

      if (!ticketId) {
        throw new Error("Ticket created but no ID was returned.");
      }

      // 2. Upload attachments if any exist
      if (files.length > 0 && ticketId) {
        await ticketService.uploadAttachments(ticketId, files);
      }

      navigate('/tickets');
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to submit ticket' });
      setLoading(false);
    }
  };

  return (
    <Layout title="New Ticket">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Create New Ticket</h2>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
            >
              <option value="MAINTENANCE">Maintenance</option>
              <option value="IT_SUPPORT">IT Support</option>
              <option value="CLEANING">Cleaning</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
              placeholder="Provide clear details regarding this incident..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Contact Details</label>
            <input
              type="text"
              value={formData.contactDetails}
              onChange={e => setFormData({ ...formData, contactDetails: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
              placeholder="e.g. Phone number or Room number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Attachments (Max 3 files)</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={files.length >= 3}
              className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
            {files.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="truncate max-w-[150px]">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-zinc-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
