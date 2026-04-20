import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, MessageSquare, Edit2, Trash2, XCircle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ticketService } from '../../services/api/ticketService';
import { commentService } from '../../services/api/commentService'; // Added
import { getUserId, isAdmin } from '../../utils/auth'; // Added
import Toast from '../../components/common/Toast';
import { SkeletonGrid } from '../../components/common/Skeleton';
import { showConfirm,  showSuccess, showError } from '../../utils/alerts';

export default function AdminTicketsPage() {
  const navigate = useNavigate();
  const currentUserId = getUserId();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals / Action States
  const [assignModal, setAssignModal] = useState(null);
  const [technicianId, setTechnicianId] = useState('');
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Comment Specific States for Module C
  const [commentModal, setCommentModal] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [activeComments, setActiveComments] = useState([]);

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await ticketService.getAllTickets({ status: statusFilter, priority: priorityFilter });
      const raw = res.data ?? res;
      setTickets(Array.isArray(raw) ? raw : []);
    } catch (_) {
      setToast({ type: 'error', message: 'Failed to fetch tickets' });
    } finally {
      setLoading(false);
    }
  };

  // --- COMMENT LOGIC  ---
  const openCommentModal = async (ticket) => {
    setCommentModal(ticket);
    try {
      const res = await commentService.getCommentsByTicket(ticket.id);
      setActiveComments(res.data || res);
    } catch (_) {
      setToast({ type: 'error', message: 'Failed to load comments' });
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await commentService.addComment(commentModal.id, newComment);
      setNewComment('');
      // Refresh local comments
      const res = await commentService.getCommentsByTicket(commentModal.id);
      setActiveComments(res.data || res);
      showSuccess('Posted', 'Comment added and notification triggered');
    } catch (_) {
      showError('Error', 'Failed to post comment');
    }
  };

  const handleDeleteComment = async (cId) => {
    const confirm = await showConfirm('Delete Comment?', 'This action follows ownership rules.');
    if (!confirm.isConfirmed) return;
    try {
      await commentService.deleteComment(commentModal.id, cId);
      setActiveComments(prev => prev.filter(c => c.id !== cId));
    } catch (_) {
      showError('Permission Denied', 'You can only delete your own comments.');
    }
  };

  // --- EXISTING ADMIN ACTIONS ---
  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await ticketService.assignTechnician(assignModal.id, technicianId);
      setToast({ type: 'success', message: 'Technician assigned' });
      setAssignModal(null);
      loadTickets();
    } catch (_) { setToast({ type: 'error', message: 'Failed assignment' }); }
  };

  const handleChangeStatus = async (e) => {
    e.preventDefault();
    try {
      await ticketService.updateTicketStatus(statusModal.id, {
        status: newStatus,
        resolutionNote: newStatus === 'RESOLVED' ? resolutionNote : ''
      });
      setToast({ type: 'success', message: 'Status updated' });
      setStatusModal(null);
      loadTickets();
    } catch (err) { setToast({ type: 'error', message: 'Invalid status transition' }); }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await ticketService.updateTicketStatus(rejectModal.id, {
        status: 'REJECTED',
        rejectionReason
      });
      setToast({ type: 'success', message: 'Ticket rejected' });
      setRejectModal(null);
      loadTickets();
    } catch (_) { setToast({ type: 'error', message: 'Failed to reject ticket' }); }
  };

  return (
    <Layout title="Admin Ticketing">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">All Tickets (Admin Board)</h2>
        <div className="flex gap-4 mt-4">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 text-sm py-2 px-3 text-zinc-900 dark:text-zinc-100">
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="rounded-lg border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 text-sm py-2 px-3 text-zinc-900 dark:text-zinc-100">
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold uppercase">
              <tr>
                <th className="px-6 py-4">ID / Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Assignee</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {!loading && tickets.map(t => (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
                      {t.category}
                    </div>
                    <div className="text-xs text-zinc-500">#{t.id.substring(0, 8)}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">{t.status.replace('_', ' ')}</td>
                  <td className="px-6 py-4">{t.priority}</td>
                  <td className="px-6 py-4">{t.assigneeId || '--'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openCommentModal(t)} className="p-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200" title="Comments">
                      <MessageSquare size={14} />
                    </button>
                    <button onClick={() => { setAssignModal(t); setTechnicianId(t.assigneeId || ''); }} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                      Assign
                    </button>
                    <button onClick={() => { setStatusModal(t); setNewStatus(t.status); setResolutionNote(''); }} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">
                      Status
                    </button>
                    {t.status !== 'REJECTED' && (
                      <button onClick={() => { setRejectModal(t); setRejectionReason(''); }} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- QUICK COMMENT MODAL (Satisfies Module C Ownership) --- */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-lg border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Ticket Discussions</h3>
              <button onClick={() => setCommentModal(null)}><X size={20} /></button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-3 mb-4 pr-2">
              {activeComments.map(c => (
                <div key={c.id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg relative group">
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">{c.content}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-zinc-400">By: {c.authorId?.substring(0, 5)}</span>
                    {/* OWNERSHIP RULE: Only show delete if user is author OR is admin */}
                    {(currentUserId === c.authorId || isAdmin()) && (
                      <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Write official reply..."
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 px-3 py-2 text-sm"
              />
              <button type="submit" className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium">Post</button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Assign Technician</h3>
            <form onSubmit={handleAssign}>
              <input type="text" value={technicianId} onChange={e => setTechnicianId(e.target.value)} required placeholder="Technician User ID" className="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 mb-4" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAssignModal(null)} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Change Status</h3>
            <form onSubmit={handleChangeStatus}>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 mb-4">
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              {newStatus === 'RESOLVED' && (
                <textarea required value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder="Resolution Note" rows={3} className="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 mb-4" />
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setStatusModal(null)} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><XCircle className="text-red-500" /> Reject Ticket</h3>
            <form onSubmit={handleReject}>
              <textarea required value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." className="w-full border rounded-lg px-3 py-2 mb-4" rows={3} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setRejectModal(null)} className="px-4 py-2 text-zinc-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg">Confirm Reject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}