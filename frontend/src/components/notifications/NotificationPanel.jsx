import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, CheckCircle2, AlertCircle, Info, Trash2, X, 
  ChevronRight, Calendar, Bookmark, Hammer, Shield, Building2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

const SeverityIcon = ({ severity }) => {
  switch (severity) {
    case 'SUCCESS':
      return <CheckCircle2 className="text-emerald-500" size={18} />;
    case 'ALERT':
      return <AlertCircle className="text-rose-500" size={18} />;
    default:
      return <Info className="text-violet-500" size={18} />;
  }
};

const TypeIcon = ({ type }) => {
  if (type === 'SECURITY_UPDATE') return <Shield size={14} className="text-rose-500" />;
  if (type.startsWith('BOOKING')) return <Calendar size={14} className="text-zinc-400" />;
  if (type.startsWith('TICKET')) return <Hammer size={14} className="text-zinc-400" />;
  if (type === 'RESOURCE_UPDATE') return <Building2 size={14} className="text-zinc-400" />;
  return <Bookmark size={14} className="text-zinc-400" />;
};

export default function NotificationPanel({ 
  notifications = [], 
  onMarkRead, 
  onMarkAllRead,
  onDelete, 
  onDeleteAll,
  userRole,
  onClose,
  loading 
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState('ALL'); 

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const filteredNotifications = safeNotifications.filter(n => {
    if (!n) return false;
    if (filter === 'ALERT') return n.severity === 'ALERT';
    if (filter === 'BOOKING') return n.type && n.type.startsWith('BOOKING');
    if (filter === 'TICKET') return n.type && n.type.startsWith('TICKET');
    if (filter === 'SECURITY') return n.type === 'SECURITY_UPDATE';
    if (filter === 'RESOURCE') return n.type === 'RESOURCE_UPDATE' || n.referenceType === 'RESOURCE';
    return true;
  });

  const handleNotificationClick = (notif) => {
    if (!notif || !notif.referenceId) return;

    if (!notif.isRead && onMarkRead) {
      onMarkRead(notif.id);
    }

    if (notif.referenceType === 'BOOKING') {
      if (notif.type === 'BOOKING_CREATED' && userRole === 'MANAGER') {
        navigate('/admin/bookings');
      } else {
        navigate(`/bookings/${notif.referenceId}`);
      }
    } else if (notif.referenceType === 'RESOURCE' || notif.type === 'RESOURCE_UPDATE') {
      navigate(`/resources/${notif.referenceId}`);
    } else if (notif.referenceType === 'TICKET' || (notif.type && notif.type.startsWith('TICKET'))) {
      if (notif.type === 'TICKET_CREATED' && userRole === 'MANAGER') {
        navigate('/admin/tickets');
      } else {
        navigate(`/tickets/${notif.referenceId}`);
      }
    } else if (notif.type === 'SECURITY_UPDATE') {
      if (userRole === 'MANAGER') {
        navigate('/admin/users');
      } else {
        navigate('/profile');
      }
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute right-0 mt-3 w-96 max-h-[600px] overflow-hidden bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-violet-600 dark:text-violet-400" />
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Updates</h3>
          {notifications.filter(n => n && !n.isRead).length > 0 && (
            <span className="bg-violet-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {notifications.filter(n => n && !n.isRead).length} NEW
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {notifications.some(n => !n.isRead) && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                onMarkAllRead && onMarkAllRead();
              }}
              className="text-[10px] font-bold text-violet-500 hover:text-violet-600 transition-colors uppercase tracking-wider"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                onDeleteAll && onDeleteAll();
              }}
              className="text-[10px] font-bold text-zinc-400 hover:text-rose-500 transition-colors uppercase tracking-wider"
            >
              Clear All
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Admin Filters */}
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1 bg-white dark:bg-zinc-900">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'ALERT', label: 'Alerts' },
          { id: 'BOOKING', label: 'Bookings' },
          { id: 'TICKET', label: 'Tickets' },
          { id: 'SECURITY', label: 'Security' },
          { id: 'RESOURCE', label: 'Resources' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
              filter === t.id 
                ? 'bg-violet-600 text-white' 
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-zinc-50/30 dark:bg-zinc-900/30">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-zinc-500 font-medium">Syncing notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Bell size={24} className="text-zinc-300" />
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              {filter === 'ALL' ? 'All caught up!' : `No ${filter.toLowerCase()}s found`}
            </p>
            <p className="text-xs text-zinc-500">Check back later for new updates.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notif) => (
              <motion.div
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative p-3 rounded-xl transition-all duration-200 flex gap-3 cursor-pointer border ${
                  notif.isRead 
                    ? 'bg-transparent border-transparent grayscale-[0.5] opacity-60 hover:opacity-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50' 
                    : `shadow-sm ${notif.severity === 'ALERT' 
                        ? 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-200/50 dark:border-rose-500/20 animate-pulse' 
                        : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700'
                      }`
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  <SeverityIcon severity={notif.severity} />
                </div>
                
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-0.5">
                    <TypeIcon type={notif.type || ''} />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {(notif.type || 'System').replace('_', ' ')}
                    </span>
                    {!notif.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
                    )}
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug mb-1 font-medium">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                    <span className="font-medium whitespace-nowrap">
                      {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : 'Just now'}
                    </span>
                    {notif.severity === 'ALERT' && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold uppercase tracking-tighter text-[8px]">
                            Immediate Attention
                        </span>
                    )}
                  </div>
                </div>

                <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete && onDelete(notif.id);
                    }}
                    className="p-1.5 bg-white dark:bg-zinc-800 shadow-md rounded-lg text-rose-500 hover:bg-rose-50 transition-colors border border-zinc-100 dark:border-zinc-700"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        <button 
          onClick={() => {
            navigate('/notifications');
            onClose();
          }}
          className="w-full py-2 text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-600/5 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          View All History <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}
