import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  CalendarDays,
  PlusSquare,
  ClipboardList,
  Users,
  Package,
  BookOpen,
  Wrench,
  Bell,
  X,
} from 'lucide-react';
import bookingService from '../../services/api/bookingService';

const navItem = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors';
const activeClass = 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300';
const inactiveClass =
  'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

const sectionLabel = 'pt-4 pb-1 px-3';
const sectionLabelText = 'text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500';

export default function Sidebar({ open, onClose }) {
  // Use the auth context so we only run admin checks once the user is fully loaded
  const { user, loading } = useAuth();
  const admin = user?.role === 'ADMIN';
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Wait until auth is resolved and the user is confirmed as ADMIN
    if (loading || !admin) return;
    bookingService
      .getAllBookings({ status: 'PENDING' })
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        setPendingCount(Array.isArray(raw) ? raw.length : 0);
      })
      .catch(() => {});
  }, [admin, loading]);

  const NAVBAR_OFFSET = 'top-[72px]';

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className={`fixed inset-x-0 bottom-0 ${NAVBAR_OFFSET} z-20 bg-black/40 lg:hidden`}
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed inset-x-0 left-0 z-30 flex w-64 flex-col bg-white border-r border-zinc-200',
          `bottom-0 ${NAVBAR_OFFSET}`,
          'dark:bg-zinc-950 dark:border-zinc-800',
          'transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:translate-x-0 lg:flex lg:top-[72px] lg:h-[calc(100dvh-72px)]',
        ].join(' ')}
      >
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Mobile close */}
          <div className="flex justify-end lg:hidden pb-2">
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── General ── */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
            onClick={onClose}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink
            to="/resources"
            className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
            onClick={onClose}
          >
            <BookOpen size={18} />
            Resources
          </NavLink>

          <NavLink
            to="/bookings"
            end
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

          <NavLink
            to="/tickets"
            className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
            onClick={onClose}
          >
            <Wrench size={18} />
            Maintenance Tickets
          </NavLink>

          <NavLink
            to="/notifications"
            className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
            onClick={onClose}
          >
            <Bell size={18} />
            Notifications
          </NavLink>

          {/* ── Admin section ── */}
          {admin && (
            <>
              <div className={sectionLabel}>
                <p className={sectionLabelText}>Admin</p>
              </div>

              <NavLink
                to="/admin/users"
                className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
              >
                <Users size={18} />
                Manage Users
              </NavLink>

              <NavLink
                to="/admin/bookings"
                className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
              >
                <div className="flex items-center gap-3 flex-1">
                  <ClipboardList size={18} />
                  Manage Bookings
                </div>
                {pendingCount > 0 && (
                  <span className="ml-auto shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/admin/resources"
                className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
              >
                <Package size={18} />
                Manage Resources
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
