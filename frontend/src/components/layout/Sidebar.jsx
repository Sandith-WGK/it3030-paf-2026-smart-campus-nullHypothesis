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
  X,
  Ticket,
  Briefcase,
} from 'lucide-react';
import bookingService from '../../services/api/bookingService';

const navItem = 'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors';
const activeClass = 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300';
const inactiveClass =
  'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

const sectionLabel = 'pt-4 pb-1 px-3';
const sectionLabelText = 'text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500';

export default function Sidebar({ open, onClose, collapsed = false }) {
  // Use the auth context so we only run admin checks once the user is fully loaded
  const { user, loading } = useAuth();
  const admin = String(user?.role || '').trim().toUpperCase() === 'ADMIN';
  const [pendingCount, setPendingCount] = useState(0);
  const technician = String(user?.role || '').trim().toUpperCase() === 'TECHNICIAN';
  const canSeeTasks = technician;


  useEffect(() => {
    // Wait until auth is resolved and the user is confirmed as ADMIN
    if (loading || !admin) return;
    bookingService
      .getAllBookings({ status: 'PENDING' })
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (typeof raw?.totalElements === 'number') {
          setPendingCount(raw.totalElements);
          return;
        }
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
          collapsed ? 'lg:w-20' : 'lg:w-64',
        ].join(' ')}
      >
        <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
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
            className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
            onClick={onClose}
            title={collapsed ? 'Dashboard' : undefined}
          >
            <LayoutDashboard size={18} />
            <span className={collapsed ? 'lg:hidden' : ''}>Dashboard</span>
          </NavLink>

          <NavLink
            to="/resources"
            className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
            onClick={onClose}
            title={collapsed ? 'Resources' : undefined}
          >
            <BookOpen size={18} />
            <span className={collapsed ? 'lg:hidden' : ''}>Resources</span>
          </NavLink>

          {!technician && (
            <>
              <NavLink
                to="/bookings"
                end
                className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
                title={collapsed ? 'My Bookings' : undefined}
              >
                <CalendarDays size={18} />
                <span className={collapsed ? 'lg:hidden' : ''}>My Bookings</span>
              </NavLink>

              <NavLink
                to="/bookings/new"
                className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
                title={collapsed ? 'New Booking' : undefined}
              >
                <PlusSquare size={18} />
                <span className={collapsed ? 'lg:hidden' : ''}>New Booking</span>
              </NavLink>

              <NavLink
                to="/tickets"
                className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
                title={collapsed ? 'Maintenance Tickets' : undefined}
              >
                <Wrench size={18} />
                <span className={collapsed ? 'lg:hidden' : ''}>Maintenance Tickets</span>
              </NavLink>
            </>
          )}

          {canSeeTasks && (
            <NavLink
              to="/technician/tasks"
              className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
              onClick={onClose}
              title={collapsed ? 'My Tasks' : undefined}
            >
              <Briefcase size={18} />
              <span className={collapsed ? 'lg:hidden' : ''}>My Tasks</span>
            </NavLink>
          )}


          {/* ── Admin section ── */}
          {admin && (
            <>
              <div className={`${sectionLabel} ${collapsed ? 'lg:hidden' : ''}`}>
                <p className={`${sectionLabelText} ${collapsed ? 'lg:hidden' : ''}`}>Admin</p>
              </div>

              <NavLink
                to="/admin/users"
                className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
                title={collapsed ? 'Manage Users' : undefined}
              >
                <Users size={18} />
                <span className={collapsed ? 'lg:hidden' : ''}>Manage Users</span>
              </NavLink>

              <NavLink
                to="/admin/bookings"
                className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
                title={collapsed ? 'Manage Bookings' : undefined}
              >
                <div className={`flex items-center gap-3 flex-1 ${collapsed ? 'lg:justify-center lg:flex-none' : ''}`}>
                  <ClipboardList size={18} />
                  <span className={collapsed ? 'lg:hidden' : ''}>Manage Bookings</span>
                </div>
                {pendingCount > 0 && (
                  <span className={`shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-amber-500 text-white ${collapsed ? 'absolute right-1.5 top-1.5' : 'ml-auto'}`}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/admin/resources"
                className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
                title={collapsed ? 'Manage Resources' : undefined}
              >
                <Package size={18} />
                <span className={collapsed ? 'lg:hidden' : ''}>Manage Resources</span>
              </NavLink>

              <NavLink
                to="/admin/tickets"
                className={({ isActive }) => `${navItem} ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? activeClass : inactiveClass}`}
                onClick={onClose}
                title={collapsed ? 'Manage Tickets' : undefined}
              >
                <Ticket size={18} />
                <span className={collapsed ? 'lg:hidden' : ''}>Manage Tickets</span>
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
