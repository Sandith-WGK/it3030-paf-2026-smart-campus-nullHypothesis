import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Edit2, X, AlertCircle, MessageSquare, Eye, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ticketService } from '../../services/api/ticketService';
import Toast from '../../components/common/Toast';
import { SkeletonGrid } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { showSuccess, showError, showConfirm  } from '../../utils/alerts';
import { commentService } from '../../services/api/commentService';
import { getUserId } from '../../utils/auth';


export default function TechnicianTasksPage() {
  const navigate = useNavigate();
  const currentUserId = getUserId();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Status Modal State
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [commentModal, setCommentModal] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [activeComments, setActiveComments] = useState([]);

  useEffect(() => {
    loadTasks();
  }, []);

  // --- COMMENT LOGIC ---
  const openCommentModal = async (ticket) => {
    setCommentModal(ticket);
    try {
      const res = await commentService.getCommentsByTicket(ticket.id);
      setActiveComments(res.data || res);
    } catch  {
      setToast({ type: 'error', message: 'Failed to load comments' });
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await commentService.addComment(commentModal.id, newComment);
      setNewComment('');
      const res = await commentService.getCommentsByTicket(commentModal.id);
      setActiveComments(res.data || res);
      showSuccess('Posted', 'Comment added');
    } catch  {
      showError('Error', 'Failed to post comment');
    }
  };

  const handleDeleteComment = async (cId) => {
    const confirm = await showConfirm('Delete?', 'You can only delete your own comments.');
    if (!confirm.isConfirmed) return;
    try {
      await commentService.deleteComment(commentModal.id, cId);
      setActiveComments(prev => prev.filter(c => c.id !== cId));
    } catch  {
      showError('Permission Denied', 'You cannot delete comments made by others.');
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await ticketService.getMyTasks();
      const raw = res.data ?? res;
      setTasks(Array.isArray(raw) ? raw : []);
    } catch  {
      setToast({ type: 'error', message: 'Failed to load assigned tasks' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (newStatus === 'RESOLVED' && !resolutionNote.trim()) {
      showError('Required', 'Resolution note is required to resolve a ticket.');
      return;
    }

    try {
      await ticketService.updateTicketStatus(statusModal.id, {
        status: newStatus,
        resolutionNote: resolutionNote
      });
      showSuccess('Success', 'Ticket status updated successfully');
      setStatusModal(null);
      loadTasks();
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to update ticket status');
    }
  };

  const openStatusModal = (task) => {
    setStatusModal(task);
    setNewStatus(task.status);
    setResolutionNote(task.resolutionNote || '');
  };

  return (
    <Layout title="My Tasks">
      <div className="mb-8 p-8 rounded-3xl bg-gradient-to-br from-violet-900 to-indigo-900 dark:from-zinc-900 dark:to-zinc-950 text-white shadow-xl relative overflow-hidden">
        {/* Abstract decorative shapes */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-violet-400 opacity-10 blur-2xl"></div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight">Assigned Tasks</h2>
          <p className="text-violet-200 dark:text-zinc-400 mt-2 text-sm font-medium">
            Manage and resolve maintenance tickets assigned to you. Keep your queue organized.
          </p>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : tasks.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={ClipboardList}
            title="All caught up!"
            message="You have no active tasks assigned to you at the moment. Take a breather!"
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Task Details</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Progress</th>
                  <th className="px-6 py-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {tasks.map((task) => (
                  <tr key={task.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div
                        className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 cursor-pointer group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors flex items-center gap-2"
                        onClick={() => navigate(`/tickets/${task.id}`)}
                      >
                        {task.category}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                        #{task.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold text-xs ${task.priority === 'HIGH' ? 'text-red-600 dark:text-red-400' : task.priority === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
                        task.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        task.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        task.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          task.status === 'OPEN' ? 'bg-amber-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : task.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}></span>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openStatusModal(task)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        <Edit2 size={13} />
                        Update
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {/* VIEW DETAILS */}
                        <button onClick={() => setDetailModal(task)} className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:border-violet-300 hover:text-violet-600 transition-all shadow-sm" title="Preview Task">
                          <Eye size={14} />
                        </button>
                        {/* COMMENTS */}
                        <button onClick={() => openCommentModal(task)} className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm" title="Discussions">
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStatusModal(null)}></div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">Update Task Status</h3>
              <button
                onClick={() => setStatusModal(null)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Select Status
                </label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Resolution Notes {newStatus === 'RESOLVED' && <span className="text-red-500 font-bold">*</span>}
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  placeholder={newStatus === 'RESOLVED' ? "Describe how the issue was fixed..." : "Add updates or comments (optional)..."}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModal(null)}
                  className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailModal(null)}></div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold">Task Preview</h3>
              <button onClick={() => setDetailModal(null)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-950/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Problem Description</label>
                <p className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{detailModal.description}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-3">Evidence Images</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {detailModal.attachments?.map((img, i) => (
                    <a key={i} href={img.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-violet-500 transition-colors">
                      <img src={img.fileUrl} className="h-24 w-full object-cover transition-transform hover:scale-110" alt="evidence" />
                    </a>
                  )) || <p className="text-sm font-medium text-zinc-500 italic p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 col-span-3 text-center">No images attached</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discussion Modal */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCommentModal(null)}></div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold flex items-center gap-2"><MessageSquare size={20} className="text-violet-500" /> Task Discussion</h3>
              <button onClick={() => setCommentModal(null)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X size={18} /></button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-4 mb-6 pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
              {activeComments.length === 0 ? (
                <p className="text-center text-zinc-400 text-sm font-medium py-4">No comments yet</p>
              ) : activeComments.map(c => (
                <div key={c.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl relative group">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{c.content}</p>
                  <div className="flex justify-between mt-3 items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                      {c.authorId === currentUserId ? 'You' : 'User: ' + c.authorId.substring(0, 5)}
                    </span>
                    {c.authorId === currentUserId && (
                      <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
              <button type="submit" className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors">Send</button>
            </form>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
