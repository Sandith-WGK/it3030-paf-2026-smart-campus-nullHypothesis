import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MessageSquare, Paperclip, Trash2, Edit2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ticketService } from '../../services/api/ticketService';
import { commentService } from '../../services/api/commentService';
import { useAuth } from '../../context/AuthContext';
import { getUserId, isAdmin } from '../../utils/auth';
import Toast from '../../components/common/Toast';
import { SkeletonGrid } from '../../components/common/Skeleton';
import { showConfirm, showPrompt, showSuccess, showError } from '../../utils/alerts';


export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [id, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketRes, commentsRes] = await Promise.all([
        ticketService.getTicketById(id),
        commentService.getCommentsByTicket(id)
      ]);
      setTicket(ticketRes.data || ticketRes);
      
      const coms = commentsRes.data || commentsRes;
      setComments(Array.isArray(coms) ? coms : []);
    } catch (_) {
      setToast({ type: 'error', message: 'Failed to load ticket details' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setCommentLoading(true);
    try {
      await commentService.addComment(id, newComment);
      setNewComment('');
      loadData(); // reload
    } catch (_) {
      setToast({ type: 'error', message: 'Failed to post comment' });
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const result = await showConfirm('Are you sure?', 'This comment will be permanently deleted.');
    if (!result.isConfirmed) return;

    try {
      await commentService.deleteComment(id, commentId);
      showSuccess('Deleted!', 'Your comment has been removed.');
      loadData();
    } catch (_) {
      showError('Error', 'Failed to delete the comment.');
    }
  };

  const handleEditComment = async (comment) => {
    const { value: content, isConfirmed } = await showPrompt(
      'Edit Comment',
      'Update your comment...',
      comment.content
    );

    if (isConfirmed && content && content.trim() !== comment.content) {
      try {
        await commentService.editComment(id, comment.id, content.trim());
        showSuccess('Updated!', 'Comment has been updated.');
        loadData();
      } catch (_) {
        showError('Error', 'Failed to update the comment.');
      }
    }
  };

  if (loading) {
    return <Layout title="Ticket Details"><SkeletonGrid /></Layout>;
  }

  if (!ticket) {
    return <Layout title="Ticket Details"><div className="p-6 text-center text-zinc-500">Ticket not found.</div></Layout>;
  }

  return (
    <Layout title={`Ticket #${ticket.id?.substring(0,6)}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
          </button>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Ticket Details</h2>
        </div>

        {/* Main Content & Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Details Column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{ticket.category} Ticket</h3>
                  <div className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                    <Clock size={14} /> Created on {new Date(ticket.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ticket.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-700'}`}>
                  {ticket.priority} PRIORITY
                </span>
              </div>
              
              <div className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300">
                <p>{ticket.description}</p>
              </div>

              {ticket.contactDetails && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-sm">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Contact:</span> {ticket.contactDetails}
                </div>
              )}

              {ticket.resolutionNote && (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 mb-1">Resolution Note</h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">{ticket.resolutionNote}</p>
                </div>
              )}

              {ticket.rejectionReason && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">Rejection Reason</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">{ticket.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                  <Paperclip size={16} /> Attachments
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ticket.attachments.map((att, i) => (
                    <a key={i} href={att.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors">
                      <Paperclip size={14} className="text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{att.fileName}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                <MessageSquare size={16} /> Comments ({comments.length})
              </h3>
              
              <div className="space-y-4 mb-6">
                {comments.map(c => {
                  const isOwner = getUserId() === c.authorId;
                  const canDelete = isOwner || isAdmin();

                  return (
                    <div key={c.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg relative group">
                      <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{c.content}</p>
                      <span className="text-xs text-zinc-400 mt-2 block">{new Date(c.createdAt).toLocaleString()}</span>
                      
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isOwner && (
                          <button onClick={() => handleEditComment(c)} className="text-zinc-400 hover:text-blue-500 transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteComment(c.id)} className="text-zinc-400 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleCreateComment}>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Drop a comment..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 mb-3"
                />
                <button type="submit" disabled={commentLoading} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-white rounded-lg text-sm font-medium transition-colors">
                  {commentLoading ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar / Timeline */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">Status & Timeline</h3>
              
              <div className="relative border-l border-zinc-200 dark:border-zinc-700 ml-3 space-y-6">
                <div className="relative pl-6">
                  <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-violet-600 ring-4 ring-white dark:ring-zinc-900"></div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Ticket Opened</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">{new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
                
                <div className="relative pl-6">
                  <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full ring-4 ring-white dark:ring-zinc-900 ${['IN_PROGRESS','RESOLVED','CLOSED'].includes(ticket.status) ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}></div>
                  <h4 className={`text-sm font-bold ${['IN_PROGRESS','RESOLVED','CLOSED'].includes(ticket.status) ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>In Progress</h4>
                </div>

                <div className="relative pl-6">
                  <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full ring-4 ring-white dark:ring-zinc-900 ${['RESOLVED','CLOSED'].includes(ticket.status) ? 'bg-emerald-500' : (ticket.status === 'REJECTED' ? 'bg-red-500' : 'bg-zinc-200 dark:bg-zinc-700')}`}></div>
                  <h4 className={`text-sm font-bold ${['RESOLVED','CLOSED','REJECTED'].includes(ticket.status) ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                    {ticket.status === 'REJECTED' ? 'Rejected' : 'Resolved'}
                  </h4>
                  {ticket.resolvedAt && (
                    <p className="text-xs text-zinc-500 mt-0.5">{new Date(ticket.resolvedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">Assignment</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {ticket.assigneeId ? `Assigned Technician: ${ticket.assigneeId}` : 'Unassigned'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
