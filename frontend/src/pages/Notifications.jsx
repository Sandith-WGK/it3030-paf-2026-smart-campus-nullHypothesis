import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Search, Filter, Calendar, CheckSquare, 
  Trash2, Shield, CalendarDays, Hammer, Bookmark,
  ChevronRight, AlertCircle, CheckCircle2, Info,
  Archive, Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/api/notificationService';

const SeverityIcon = ({ severity }) => {
  switch (severity) {
    case 'SUCCESS':
      return <CheckCircle2 className="text-emerald-500" size={20} />;
    case 'ALERT':
      return <AlertCircle className="text-rose-500" size={20} />;
    default:
      return <Info className="text-violet-500" size={20} />;
  }
};

const TypeIcon = ({ type }) => {
  if (type === 'SECURITY_UPDATE') return <Shield size={16} className="text-rose-500" />;
  if (type.startsWith('BOOKING')) return <CalendarDays size={16} className="text-zinc-400" />;
  if (type.startsWith('TICKET')) return <Hammer size={16} className="text-zinc-400" />;
  return <Bookmark size={16} className="text-zinc-400" />;
};

export default function Notifications() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, SECURITY, BOOKING
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, UNREAD, ARCHIVED

  const currentUserId = user?.userId || user?.id || user?.sub;

  const fetchHistory = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const data = await notificationService.getUserNotificationHistory(currentUserId);
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.error(err); }
  };

  const filtered = notifications.filter(n => {
    const matchesSearch = n.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || 
                        (filterType === 'SECURITY' && n.type === 'SECURITY_UPDATE') ||
                        (filterType === 'BOOKING' && n.type.startsWith('BOOKING'));
    
    const matchesStatus = filterStatus === 'ALL' ||
                          (filterStatus === 'UNREAD' && !n.isRead) ||
                          (filterStatus === 'ARCHIVED' && n.isArchived);

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) handleMarkRead(notif.id);
    
    if (notif.referenceType === 'BOOKING') {
      if (notif.type === 'BOOKING_CREATED' && user?.role === 'ADMIN') navigate('/admin/bookings');
      else navigate(`/bookings/${notif.referenceId}`);
    } else if (notif.referenceType === 'RESOURCE') {
      navigate(`/resources/${notif.referenceId}`);
    } else if (notif.type === 'SECURITY_UPDATE') {
      if (user?.role === 'ADMIN') navigate('/admin/users');
      else navigate('/profile');
    }
  };

  return (
    <Layout title="Notification Center">
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <div className="p-2 bg-violet-600 rounded-xl">
                 <Bell className="text-white" size={24} />
              </div>
              Notification Center
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              Review and manage your complete Smart Campus activity history.
            </p>
          </div>

          <div className="flex items-center gap-3">
             <button 
               onClick={fetchHistory}
               className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-zinc-600 dark:text-zinc-400"
               title="Refresh History"
             >
                <Clock size={20} />
             </button>
             <button 
               className="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
               onClick={() => {
                  notificationService.markAllAsRead(currentUserId);
                  setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
               }}
             >
                <CheckSquare size={18} />
                Mark All Read
             </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row gap-4 mb-6 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                {['ALL', 'SECURITY', 'BOOKING'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterType === type 
                        ? 'bg-white dark:bg-zinc-900 text-violet-600 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
             </div>

             <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                {['ALL', 'UNREAD', 'ARCHIVED'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === status 
                        ? 'bg-white dark:bg-zinc-900 text-violet-600 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-3">
          {loading ? (
             <div className="py-24 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-medium">Loading history...</p>
             </div>
          ) : filtered.length === 0 ? (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="py-24 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800"
             >
                <Bell size={48} className="mx-auto text-zinc-300 mb-4" />
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No activity found</h3>
                <p className="text-zinc-500 mt-2">Adjust your filters or check back later.</p>
             </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((notif, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-5 rounded-2xl border transition-all duration-300 flex gap-5 cursor-pointer shadow-sm hover:shadow-md ${
                    notif.isRead 
                      ? 'bg-white/50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 opacity-80' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 ring-1 ring-violet-500/10'
                  } ${notif.isArchived ? 'grayscale-[0.8] opacity-60' : ''}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                       notif.severity === 'ALERT' ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-violet-50 dark:bg-violet-500/10'
                    }`}>
                      <SeverityIcon severity={notif.severity} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pr-12">
                     <div className="flex items-center gap-2 mb-1.5">
                        <TypeIcon type={notif.type || ''} />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                           {(notif.type || 'System').replace('_', ' ')}
                        </span>
                        {notif.isArchived && (
                           <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                              <Archive size={10} /> ARCHIVED
                           </span>
                        )}
                        {!notif.isRead && (
                           <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                        )}
                     </div>
                     <p className={`text-base leading-relaxed mb-2 ${
                        notif.isRead ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100 font-semibold'
                     }`}>
                        {notif.message}
                     </p>
                     <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                           <Clock size={14} />
                           {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : 'Just now'}
                        </span>
                        {notif.severity === 'ALERT' && (
                           <span className="text-rose-600 dark:text-rose-400 font-bold uppercase tracking-tighter text-[10px]">
                              Priority Alert
                           </span>
                        )}
                     </div>
                  </div>

                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {!notif.isRead && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                         className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                         title="Mark as Read"
                       >
                         <CheckCircle2 size={18} />
                       </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                      className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                      title="Delete Permanently"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </Layout>
  );
}
