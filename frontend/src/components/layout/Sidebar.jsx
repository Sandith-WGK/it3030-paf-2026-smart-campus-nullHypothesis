import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/auth';
import {
  LayoutDashboard,
  CalendarDays,
  PlusSquare,
  ClipboardList,
  LogOut,
  X,
} from 'lucide-react';

const navItem = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors';
const activeClass = 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300';
const inactiveClass =
  'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

export default function Sidebar({ open, onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const admin = isAdmin();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white border-r border-zinc-200',
          'dark:bg-zinc-950 dark:border-zinc-800',
          'transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:static lg:translate-x-0 lg:flex',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <span className="font-bold text-lg tracking-tight text-violet-600 dark:text-violet-400">
            Smart Campus
          </span>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
            onClick={onClose}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink
            to="/bookings"
            className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
            onClick={onClose}
          >
            <CalendarDays size={18} />
            My Bookings
          </NavLink>

          <NavLink
            to="/bookings/new"
            className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
            onClick={onClose}
          >
            <PlusSquare size={18} />
            New Booking
          </NavLink>

          {admin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Admin
                </p>
              </div>

              <NavLink
                to="/admin/bookings"
                className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
              >
                <ClipboardList size={18} />
                Manage Bookings
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleLogout}
            className={`${navItem} w-full text-left text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10`}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
