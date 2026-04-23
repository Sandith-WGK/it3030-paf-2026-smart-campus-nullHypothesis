import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, MessageSquare, Edit2, Trash2, XCircle, Eye} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ticketService } from '../../services/api/ticketService';
import { commentService } from '../../services/api/commentService'; 
import { getUserId, isAdmin } from '../../utils/auth'; 
import Toast from '../../components/common/Toast';
import { SkeletonGrid } from '../../components/common/Skeleton';
import { showConfirm,  showSuccess, showError } from '../../utils/alerts';

export default function AdminTicketsPage() {
  const navigate = useNavigate();
  const currentUserId = getUserId();
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]); 
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
  const [detailModal, setDetailModal] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [activeComments, setActiveComments] = useState([]);

  const getFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }; 

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketService.getAllTickets({ status: statusFilter, priority: priorityFilter });
      const raw = res.data ?? res;
      setTickets(Array.isArray(raw) ? raw : []);
    } catch {
      setToast({ type: 'error', message: 'Failed to fetch tickets' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  const loadTechnicians = useCallback(async () => {
    try {
      const res = await ticketService.getAllUsers();
      const allUsers = res.data ?? res;
      if (Array.isArray(allUsers)) {
        const filteredTechs = allUsers.filter(u =>
          u.role && u.role.toString().toUpperCase() === 'TECHNICIAN'
        );
        setTechnicians(filteredTechs);
      }
    } catch (err) {
      console.error("Error loading technicians:", err);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    loadTechnicians();
  }, [loadTickets, loadTechnicians]);

  // --- COMMENT LOGIC  ---
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
      // Refresh local comments
      const res = await commentService.getCommentsByTicket(commentModal.id);
      setActiveComments(res.data || res);
      showSuccess('Posted', 'Comment added and notification triggered');
    } catch  {
      showError('Error', 'Failed to post comment');
    }
  };

  const handleDeleteComment = async (cId) => {
    const confirm = await showConfirm('Delete Comment?', 'This action follows ownership rules.');
    if (!confirm.isConfirmed) return;
    try {
      await commentService.deleteComment(commentModal.id, cId);
      setActiveComments(prev => prev.filter(c => c.id !== cId));
    } catch  {
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
    } catch  { setToast({ type: 'error', message: 'Failed assignment' }); }
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
    } catch  { setToast({ type: 'error', message: 'Invalid status transition' }); }
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
    } catch { setToast({ type: 'error', message: 'Failed to reject ticket' }); }
  };

  const handleDeleteTicket = async (ticket) => {
    const result = await showConfirm(
      'Delete Ticket?',
      `This will permanently remove ticket #${ticket.ticketCode || ticket.id.substring(0, 8)}. This action cannot be undone.`
    );

    if (result.isConfirmed) {
      try {
        await ticketService.deleteTicket(ticket.id);
        showSuccess('Deleted!', 'Ticket has been permanently removed.');
        loadTickets();
      } catch {
        showError('Error', 'Failed to delete ticket. Please try again.');
      }
    }
  };

  return (
    <Layout title="Admin Ticketing">
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 dark:from-violet-900/20 dark:to-indigo-900/20 p-8 rounded-2xl border border-violet-100 dark:border-violet-900/30">
          <div>
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 tracking-tight">
              Manage Tickets
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2 font-medium">
              Manage all campus tickets, assign personnel, and track resolutions.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          className="appearance-none font-medium bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select 
          value={priorityFilter} 
          onChange={e => setPriorityFilter(e.target.value)}
          className="appearance-none font-medium bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4">Request Detail</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan="5" className="p-8"><SkeletonGrid /></td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan="5" className="p-12 text-center text-zinc-500 font-medium">No tickets found matching current filters.</td></tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 cursor-pointer group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors flex items-center gap-2" onClick={() => navigate(`/tickets/${t.id}`)}>
                        {t.category}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                         #{t.ticketCode || t.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
                        t.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        t.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        t.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          t.status === 'OPEN' ? 'bg-amber-500' : t.status === 'IN_PROGRESS' ? 'bg-blue-500' : t.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}></span>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold text-xs ${t.priority === 'HIGH' ? 'text-red-600 dark:text-red-400' : t.priority === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      {t.assigneeId ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                            {t.assigneeId.substring(0,2).toUpperCase()}
                          </div>
                          {t.assigneeId.substring(0,6)}...
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                       <button onClick={() => setDetailModal(t)} className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:border-violet-300 hover:text-violet-600 transition-all shadow-sm" title="Preview Task">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openCommentModal(t)} className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm" title="Comments">
                          <MessageSquare size={14} />
                        </button>
                        <button onClick={() => { setAssignModal(t); setTechnicianId(t.assigneeId || ''); }} className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold hover:border-violet-300 hover:text-violet-600 transition-all shadow-sm flex items-center gap-1.5">
                          Assigned
                        </button>
                        <button onClick={() => { setStatusModal(t); setNewStatus(t.status); setResolutionNote(''); }} className="px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1.5">
                          Status
                        </button>
                        {t.status !== 'REJECTED' && (
                          <button onClick={() => { setRejectModal(t); setRejectionReason(''); }} className="p-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title="Reject Ticket">
                            <X size={14} strokeWidth={3} />
                          </button>
                        )}

                        <button 
                          onClick={() => handleDeleteTicket(t)} 
                          className="p-2 bg-zinc-50 text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all shadow-sm" 
                          title="Delete Ticket"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- QUICK COMMENT MODAL --- */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCommentModal(null)}></div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold flex items-center gap-2"><MessageSquare size={20} className="text-violet-500" /> Discussion</h3>
              <button onClick={() => setCommentModal(null)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X size={18} /></button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-4 mb-6 pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
              {activeComments.length === 0 ? (
                <p className="text-center text-zinc-400 text-sm font-medium py-4">No comments yet</p>
              ) : activeComments.map(c => (
                <div key={c.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl relative group">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">{c.content}</p>
                  <div className="flex justify-between mt-3 items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">User: {c.authorId?.substring(0, 5)}</span>
                    {(currentUserId === c.authorId || isAdmin()) && (
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
                placeholder="Official reply..."
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
              <button type="submit" className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors">Post</button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAssignModal(null)}></div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl">
            <h3 className="text-xl font-extrabold mb-6">Assign Representative</h3>
            <form onSubmit={handleAssign} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Select Technician</label>
                <select
                  value={technicianId}
                  onChange={e => setTechnicianId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none"
                >
                  <option value="">-- Choose available technician --</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.technicianId ? `[${tech.technicianId}] ` : ''}{tech.name} ({tech.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAssignModal(null)} className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStatusModal(null)}></div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl">
            <h3 className="text-xl font-extrabold mb-6">Update Status</h3>
            <form onSubmit={handleChangeStatus} className="space-y-5">
              <div>
                 <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Status Stage</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer">
                  <option value="OPEN">OPEN - Reviewing</option>
                  <option value="IN_PROGRESS">IN PROGRESS - Working on it</option>
                  <option value="RESOLVED">RESOLVED - Issue Fixed</option>
                  <option value="CLOSED">CLOSED - Archived</option>
                </select>
              </div>
              {newStatus === 'RESOLVED' && (
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Resolution Note <span className="text-red-500">*</span></label>
                  <textarea required value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder="How was it fixed?" rows={3} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none" />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setStatusModal(null)} className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all">Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectModal(null)}></div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md border border-red-200 dark:border-red-900/30 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
            <h3 className="text-xl font-extrabold mb-6 flex items-center gap-2 text-red-600 dark:text-red-400"><XCircle size={24} /> Reject Ticket</h3>
            <form onSubmit={handleReject} className="space-y-5">
               <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Rejection Reason</label>
                  <textarea required value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this is rejected..." className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none" rows={3} />
               </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setRejectModal(null)} className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-500/20 hover:scale-105 active:scale-95 transition-all">Confirm Reject</button>
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
              <h3 className="text-xl font-extrabold">Ticket Preview</h3>
              <button onClick={() => setDetailModal(null)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-950/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Problem Description</label>
                <p className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap mb-4">{detailModal.description}</p>
                
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Contact: {detailModal.preferredContactMethod || 'Other'}</label>
                  <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
                    {detailModal.preferredContactMethod === 'EMAIL' ? detailModal.email : (detailModal.preferredContactMethod === 'PHONE' ? detailModal.phoneNumber : detailModal.contactDetails)}
                  </p>
                  {detailModal.preferredContactMethod && detailModal.contactDetails && (
                    <p className="text-[11px] text-zinc-500 mt-1 italic">{detailModal.contactDetails}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-3">Evidence Images</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {detailModal.attachments?.map((img, i) => (
                    <div key={i} onClick={() => setSelectedImage(getFileUrl(img.fileUrl))} className="cursor-pointer block overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-violet-500 transition-colors">
                      <img src={getFileUrl(img.fileUrl)} className="h-24 w-full object-cover transition-transform hover:scale-110" alt="evidence" />
                    </div>
                  )) || <p className="text-sm font-medium text-zinc-500 italic p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 col-span-3 text-center">No images attached</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Overlay */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setSelectedImage(null)}>
          <button 
            onClick={() => setSelectedImage(null)} 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[110]"
          >
            <X size={24} />
          </button>
          <img 
            src={selectedImage} 
            alt="Full Preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}