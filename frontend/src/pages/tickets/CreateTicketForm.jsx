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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
            Submit a Request
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">
            Please fill in the details below to open a new support or maintenance ticket.
          </p>
        </div>

        <div className="relative">
          {/* Decorative backdrop gradients */}
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 rounded-2xl blur opacity-20 dark:opacity-40"></div>
          
          <form 
            onSubmit={handleSubmit} 
            className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-2xl space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">Category</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  >
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="IT_SUPPORT">IT Support</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">Priority</label>
                <div className="relative">
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  >
                    <option value="LOW">Low - No immediate disruption</option>
                    <option value="MEDIUM">Medium - Partial disruption</option>
                    <option value="HIGH">High - Urgent attention needed</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">Contact Details</label>
              <input
                type="text"
                value={formData.contactDetails}
                onChange={e => setFormData({ ...formData, contactDetails: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none placeholder:text-zinc-400"
                placeholder="e.g. Phone number or Room number so we can reach you"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none resize-none placeholder:text-zinc-400"
                placeholder="Provide clear details regarding the incident or required maintenance..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase flex justify-between">
                <span>Attachments</span>
                <span className="text-[10px] font-medium opacity-60">Max 3 files</span>
              </label>
              <div className="flex flex-col gap-4">
                <label className="flex justify-center w-full h-32 px-4 transition bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 border-dashed rounded-xl appearance-none cursor-pointer hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/5 focus:outline-none">
                  <span className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="font-medium text-zinc-600 dark:text-zinc-400 text-sm">
                      Drop files to Attach, or <span className="text-violet-600 dark:text-violet-400 underline">browse</span>
                    </span>
                  </span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    disabled={files.length >= 3}
                    className="hidden"
                  />
                </label>

                {files.length > 0 && (
                  <div className="flex gap-3 flex-wrap">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/50 shadow-sm transition-all hover:shadow-md">
                        <span className="truncate max-w-[120px] font-medium">{f.name}</span>
                        <button type="button" onClick={() => removeFile(i)} className="text-zinc-400 hover:text-red-500 transition-colors p-1 bg-white/50 dark:bg-zinc-900/50 rounded-md">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 mt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className="px-6 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="relative overflow-hidden group px-8 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all group-hover:from-indigo-600 group-hover:to-violet-600"></div>
                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Ticket'
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
