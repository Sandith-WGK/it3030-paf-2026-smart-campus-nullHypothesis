import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, CheckCircle2, AlertCircle, Info, Trash2, X, 
  ChevronRight, Calendar, Bookmark, Hammer 
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
  if (type.startsWith('BOOKING')) return <Calendar size={14} className="text-zinc-400" />;
  if (type.startsWith('TICKET')) return <Hammer size={14} className="text-zinc-400" />;
  return <Bookmark size={14} className="text-zinc-400" />;
};

export default function NotificationPanel({ 
  notifications, 
  onMarkRead, 
  onDelete, 
  onClose,
  loading 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute right-0 mt-3 w-96 max-h-[550px] overflow-hidden bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-violet-600 dark:text-violet-400" />
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Notifications</h3>
          {notifications.filter(n => !n.isRead).length > 0 && (
            <span className="bg-violet-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {notifications.filter(n => !n.isRead).length} NEW
            </span>
          )}
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-zinc-500 font-medium">Loading updates...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Bell size={24} className="text-zinc-300" />
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">All caught up!</p>
            <p className="text-xs text-zinc-500">You don't have any notifications right now.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <motion.div
              layout
              key={notif.id}
              className={`group relative p-3 rounded-xl transition-all duration-200 flex gap-3 ${
                notif.isRead 
                  ? 'bg-transparent grayscale-[0.5] opacity-75' 
                  : 'bg-violet-50/50 dark:bg-violet-500/5 border-l-2 border-violet-500 shadow-sm'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                <SeverityIcon severity={notif.severity} />
              </div>
              
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 mb-0.5">
                  <TypeIcon type={notif.type} />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {notif.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug mb-1 font-medium">
                  {notif.message}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Actions Overlay */}
              <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notif.isRead && (
                  <button 
                    onClick={() => onMarkRead(notif.id)}
                    className="p-1.5 bg-white dark:bg-zinc-800 shadow-md rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Mark as read"
                  >
                    <CheckCircle2 size={14} />
                  </button>
                )}
                <button 
                  onClick={() => onDelete(notif.id)}
                  className="p-1.5 bg-white dark:bg-zinc-800 shadow-md rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
          <button className="w-full py-2 text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-600/5 rounded-lg transition-colors flex items-center justify-center gap-1">
            View All History <ChevronRight size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
