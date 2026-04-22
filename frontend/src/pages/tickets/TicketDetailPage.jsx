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
    } catch {
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
    } catch {
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
    } catch  {
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
      } catch  {
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
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 shadow-lg shadow-violet-500/20 text-white">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 h-10 w-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl transition-colors">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Ticket #{ticket.id?.substring(0,6)}</h2>
              <p className="text-violet-100 text-sm font-medium mt-1 opacity-90">View details, history, and discussions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md ${ticket.priority === 'HIGH' ? 'bg-red-500/90 text-white shadow-sm shadow-red-500/50' : 'bg-white/20 text-white'}`}>
                {ticket.priority} PRIORITY
              </span>
          </div>
        </div>

        {/* Main Content & Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Details Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
                    {ticket.category} Request
                  </h3>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2 font-medium">
                    <Clock size={16} className="text-violet-500" /> Opened on {new Date(ticket.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short'})}
                  </div>
                </div>
              </div>
              
              <div className="prose dark:prose-invert max-w-none text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 p-6 bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {ticket.contactDetails && (
                <div className="mt-6 flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-900/30 text-sm">
                  <div className="h-10 w-10 flex justify-center items-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Contact Info</span>
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">{ticket.contactDetails}</span>
                  </div>
                </div>
              )}

              {ticket.resolutionNote && (
                <div className="mt-8 relative overflow-hidden p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-2xl"></div>
                  <h4 className="text-base font-bold text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Resolution Note
                  </h4>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 leading-relaxed pl-1">{ticket.resolutionNote}</p>
                </div>
              )}

              {ticket.rejectionReason && (
                <div className="mt-8 relative overflow-hidden p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-2xl"></div>
                  <h4 className="text-base font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Rejection Reason
                  </h4>
                  <p className="text-sm font-medium text-red-900 dark:text-red-300 leading-relaxed pl-1">{ticket.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-6">
                  <Paperclip size={18} className="text-violet-500" /> Attached Evidence
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {ticket.attachments.map((att, i) => (
                    <a key={i} href={att.fileUrl} target="_blank" rel="noreferrer" className="group flex flex-col justify-center gap-3 p-4 bg-zinc-50 hover:bg-violet-50 dark:bg-zinc-950/50 dark:hover:bg-violet-900/20 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700/50 transition-all hover:shadow-md hover:-translate-y-1">
                      <div className="h-10 w-10 flex justify-center items-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 group-hover:bg-violet-200 transition-colors">
                        <Paperclip size={18} />
                      </div>
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate group-hover:text-violet-700 dark:group-hover:text-violet-400">{att.fileName}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg mb-8">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <MessageSquare size={18} />
                </div>
                Discussion Thread <span className="text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full">{comments.length}</span>
              </h3>
              
              <div className="space-y-6 mb-8">
                {comments.length === 0 ? (
                  <p className="text-sm font-medium text-zinc-500 text-center italic py-4">No comments yet. Start the conversation!</p>
                ) : comments.map(c => {
                  const isOwner = getUserId() === c.authorId;
                  const canDelete = isOwner || isAdmin();

                  return (
                    <div key={c.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                      <div className={`relative group max-w-[85%] sm:max-w-[70%] p-5 rounded-2xl text-[15px] shadow-sm ${
                        isOwner 
                          ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-none' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{c.content}</p>
                        
                        <div className={`text-[11px] font-medium mt-3 flex items-center opacity-70 ${isOwner ? 'text-violet-100' : 'text-zinc-500'}`}>
                           {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                        
                        <div className={`absolute ${isOwner ? '-left-12 top-2' : '-right-12 top-2'} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                          {isOwner && (
                            <button onClick={() => handleEditComment(c)} className="p-1.5 bg-white shadow-md dark:bg-zinc-700 text-zinc-500 hover:text-blue-500 rounded-full transition-transform hover:scale-110" title="Edit">
                              <Edit2 size={12} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDeleteComment(c.id)} className="p-1.5 bg-white shadow-md dark:bg-zinc-700 text-zinc-500 hover:text-red-500 rounded-full transition-transform hover:scale-110" title="Delete">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleCreateComment} className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 relative">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Type a message here..."
                  rows={3}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 px-5 py-4 pr-32 text-[15px] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all resize-none shadow-inner"
                />
                <div className="absolute right-3 bottom-5">
                  <button type="submit" disabled={commentLoading || !newComment.trim()} className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-md">
                    {commentLoading ? 'Posting' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar / Timeline */}
          <div className="space-y-6">
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg sticky top-6">
              <h3 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">Activity Timeline</h3>
              
              <div className="relative border-l-2 border-zinc-100 dark:border-zinc-800 ml-4 space-y-8 pb-4">
                <div className="relative pl-8">
                  <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-violet-600 ring-4 ring-violet-100 dark:ring-violet-900/30 flex items-center justify-center">
                     <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                  <h4 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 -mt-1">Ticket Opened</h4>
                  <p className="text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-wider">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
                
                <div className="relative pl-8">
                  <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full flex items-center justify-center transition-all ${['IN_PROGRESS','RESOLVED','CLOSED'].includes(ticket.status) ? 'bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/30 animate-pulse' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                    {['IN_PROGRESS','RESOLVED','CLOSED'].includes(ticket.status) && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                  </div>
                  <h4 className={`text-[15px] font-bold -mt-1 ${['IN_PROGRESS','RESOLVED','CLOSED'].includes(ticket.status) ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>In Progress</h4>
                </div>

                <div className="relative pl-8">
                  <div className={`absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all ${['RESOLVED','CLOSED'].includes(ticket.status) ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/30' : (ticket.status === 'REJECTED' ? 'bg-red-500 ring-4 ring-red-100 dark:ring-red-900/30' : 'bg-zinc-200 dark:bg-zinc-700')}`}>
                     {['RESOLVED','CLOSED','REJECTED'].includes(ticket.status) && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <h4 className={`text-[15px] font-bold -mt-1 ${['RESOLVED','CLOSED','REJECTED'].includes(ticket.status) ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                    {ticket.status === 'REJECTED' ? 'Rejected' : 'Resolved'}
                  </h4>
                  {ticket.resolvedAt && (
                    <p className="text-xs font-semibold text-emerald-600 mt-1 uppercase tracking-wider">{new Date(ticket.resolvedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

               <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Assigned To</h4>
                  {ticket.assigneeId ? (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                       <div className="h-10 w-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                          {ticket.assigneeId.substring(0,2).toUpperCase()}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Technician ID</p>
                         <p className="text-xs font-medium text-zinc-500">{ticket.assigneeId.substring(0,8)}...</p>
                       </div>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-zinc-500 italic p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">Unassigned</div>
                  )}
               </div>
            </div>
            
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
