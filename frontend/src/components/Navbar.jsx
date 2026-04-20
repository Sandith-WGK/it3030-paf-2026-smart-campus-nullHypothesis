import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/useTheme';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  User as UserIcon, 
  Settings as SettingsIcon, 
  ChevronDown, 
  Bell, 
  Moon, 
  Sun,
  BellRing
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './notifications/NotificationPanel';

const Navbar = ({ leftSlot = null }) => {
  const { user, token, logout } = useAuth();
  const { toggleTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const currentUserId = user?.userId || user?.id || user?.sub;

  const { 
    notifications, 
    loading: loadingNotifs, 
    connected,
    markAsRead: handleMarkRead, 
    markAllAsRead,
    deleteNotification: handleDeleteNotif,
    deleteAll
  } = useNotifications(currentUserId, token);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {leftSlot}
        <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">SC</span>
          </div>
          <h1 className="font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
            Smart<span className="text-violet-600 dark:text-violet-400">Campus</span>
          </h1>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {/* Toggle Theme */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all border border-transparent hover:border-violet-200 dark:hover:border-violet-800 shadow-sm"
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => {
              const nextState = !isNotifOpen;
              setIsNotifOpen(nextState);
              if (nextState) {
                markAllAsRead(); // Mark all as read when opening
              }
            }}
            className={`p-2.5 rounded-xl transition-all relative group ${
              isNotifOpen 
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' 
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {notifications?.some(n => n && !n.isRead) ? (
              <BellRing size={22} className="text-rose-500 animate-bounce" />
            ) : (
              <Bell size={22} />
            )}
            
            {notifications?.filter(n => n && !n.isRead).length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm">
                {notifications.filter(n => n && !n.isRead).length}
              </span>
            )}

            {/* Connection Status Indicator */}
            <div 
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm transition-colors duration-500 ${
                connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
              title={connected ? 'Real-time connected' : 'Connecting or disconnected...'}
            ></div>
          </button>

          <AnimatePresence>
            {isNotifOpen && (
              <NotificationPanel 
                notifications={notifications}
                onMarkRead={handleMarkRead}
                onDelete={handleDeleteNotif}
                onDeleteAll={deleteAll}
                userRole={user?.role}
                onClose={() => setIsNotifOpen(false)}
                loading={loadingNotifs}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 p-1.5 pl-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-transparent hover:border-violet-300 dark:hover:border-violet-700 group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-none mb-0.5">{user?.name || 'My Account'}</p>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{user?.role || 'Member'}</p>
            </div>
            
            <div className="relative">
              <img 
                src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name || user?.email}&background=random`} 
                alt="Avatar" 
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-zinc-900 shadow-sm"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
            </div>

            <ChevronDown size={16} className={`text-zinc-400 group-hover:text-zinc-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 mt-3 w-60 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden py-2"
              >
                <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Account Info</p>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 truncate">{user?.email}</p>
                </div>

                <Link 
                  to="/profile" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                >
                  <UserIcon size={18} />
                  My Profile
                </Link>

                <Link 
                  to="/settings" 
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                >
                  <SettingsIcon size={18} />
                  Settings
                </Link>

                <div className="my-2 border-t border-zinc-100 dark:border-zinc-800"></div>

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
