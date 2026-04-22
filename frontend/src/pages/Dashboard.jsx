import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Clock3,
  Flame,
  LifeBuoy,
  Package,
  Shield,
  Ticket,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { isAdmin, isTechnician } from '../utils/auth';
import bookingService from '../services/api/bookingService';
import { ticketService } from '../services/api/ticketService';
import resourceService from '../services/api/resourceService';
import { notificationService } from '../services/api/notificationService';

const extractArray = (payload) => {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  return Array.isArray(data) ? data : [];
};

// eslint-disable-next-line no-unused-vars
function StatCard({ label, value, icon: StatIcon, color, bg, loading: busy }) {
const extractCount = (payload) => {
  if (typeof payload === 'number') return payload;
  if (typeof payload?.count === 'number') return payload.count;
  if (typeof payload?.unreadCount === 'number') return payload.unreadCount;
  if (typeof payload?.data?.count === 'number') return payload.data.count;
  if (typeof payload?.data?.unreadCount === 'number') return payload.data.unreadCount;
  return 0;
};

function SummaryCard({ title, value, subtitle, icon, tone, loading }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm bg-white dark:bg-zinc-900 ${tone.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className={`mt-2 text-3xl font-extrabold ${tone.text}`}>
            {loading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" /> : value}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-3 ${tone.bg}`}>{React.createElement(icon, { size: 20, className: tone.text })}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const admin = isAdmin();
  const technician = isTechnician();
  const roleLabel = admin ? 'ADMIN' : technician ? 'TECHNICIAN' : 'USER';
  const currentUserId = user?.userId || user?.id || user?.sub;

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    userUpcomingBookings: 0,
    userOpenTickets: 0,
    userUnreadNotifications: 0,
    adminPendingBookings: 0,
    adminHighPriorityOpenTickets: 0,
    adminActiveResources: 0,
    adminOutOfServiceResources: 0,
    technicianAssigned: 0,
    technicianInProgress: 0,
    technicianOverdue: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    let mounted = true;
    const today = new Date();
    const staleThreshold = new Date(today.getTime() - 72 * 60 * 60 * 1000); // 72h SLA hint

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        if (admin) {
          const [pendingRes, highPrioRes, resourcesRes, unreadRes, historyRes] = await Promise.allSettled([
            bookingService.getAllBookings({ status: 'PENDING' }),
            ticketService.getAllTickets({ status: 'OPEN', priority: 'HIGH' }),
            resourceService.getResources(),
            currentUserId ? notificationService.getUnreadCount(currentUserId) : Promise.resolve(0),
            currentUserId ? notificationService.getUserNotificationHistory(currentUserId) : Promise.resolve([]),
          ]);

          const pendingBookings = pendingRes.status === 'fulfilled' ? extractArray(pendingRes.value).length : 0;
          const highPriorityOpenTickets = highPrioRes.status === 'fulfilled' ? extractArray(highPrioRes.value).length : 0;
          const resources = resourcesRes.status === 'fulfilled' ? extractArray(resourcesRes.value) : [];
          const outOfService = resources.filter((r) => String(r.status || '').toUpperCase() === 'OUT_OF_SERVICE').length;
          const activeResources = resources.filter((r) => String(r.status || '').toUpperCase() !== 'OUT_OF_SERVICE').length;
          const unread = unreadRes.status === 'fulfilled' ? extractCount(unreadRes.value) : 0;
          const activity = historyRes.status === 'fulfilled' ? extractArray(historyRes.value).slice(0, 5) : [];

          if (!mounted) return;
          setMetrics((prev) => ({
            ...prev,
            adminPendingBookings: pendingBookings,
            adminHighPriorityOpenTickets: highPriorityOpenTickets,
            adminActiveResources: activeResources,
            adminOutOfServiceResources: outOfService,
            userUnreadNotifications: unread,
          }));
          setRecentActivity(activity);
        } else if (technician) {
          const [tasksRes, unreadRes, historyRes] = await Promise.allSettled([
            ticketService.getMyTasks(),
            currentUserId ? notificationService.getUnreadCount(currentUserId) : Promise.resolve(0),
            currentUserId ? notificationService.getUserNotificationHistory(currentUserId) : Promise.resolve([]),
          ]);

          const tasks = tasksRes.status === 'fulfilled' ? extractArray(tasksRes.value) : [];
          const assigned = tasks.length;
          const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
          const overdue = tasks.filter((t) => {
            const status = String(t.status || '').toUpperCase();
            if (status === 'RESOLVED' || status === 'CLOSED' || status === 'REJECTED') return false;
            const createdAt = t.createdAt ? new Date(t.createdAt) : null;
            return createdAt && createdAt < staleThreshold;
          }).length;
          const unread = unreadRes.status === 'fulfilled' ? extractCount(unreadRes.value) : 0;
          const activity = historyRes.status === 'fulfilled' ? extractArray(historyRes.value).slice(0, 5) : [];

          if (!mounted) return;
          setMetrics((prev) => ({
            ...prev,
            technicianAssigned: assigned,
            technicianInProgress: inProgress,
            technicianOverdue: overdue,
            userUnreadNotifications: unread,
          }));
          setRecentActivity(activity);
        } else {
          const [bookingsRes, ticketsRes, unreadRes, historyRes] = await Promise.allSettled([
            bookingService.getMyBookings(),
            ticketService.getMyTickets(),
            currentUserId ? notificationService.getUnreadCount(currentUserId) : Promise.resolve(0),
            currentUserId ? notificationService.getUserNotificationHistory(currentUserId) : Promise.resolve([]),
          ]);

          const bookings = bookingsRes.status === 'fulfilled' ? extractArray(bookingsRes.value) : [];
          const tickets = ticketsRes.status === 'fulfilled' ? extractArray(ticketsRes.value) : [];
          const upcomingBookings = bookings.filter((b) => {
            const status = String(b.status || '').toUpperCase();
            if (!['PENDING', 'APPROVED'].includes(status)) return false;
            const dateStr = b.bookingDate || b.date || b.startDate;
            if (!dateStr) return false;
            return new Date(dateStr) >= new Date(new Date().toDateString());
          }).length;
          const openTickets = tickets.filter((t) => ['OPEN', 'IN_PROGRESS'].includes(String(t.status || '').toUpperCase())).length;
          const unread = unreadRes.status === 'fulfilled' ? extractCount(unreadRes.value) : 0;
          const activity = historyRes.status === 'fulfilled' ? extractArray(historyRes.value).slice(0, 5) : [];

          if (!mounted) return;
          setMetrics((prev) => ({
            ...prev,
            userUpcomingBookings: upcomingBookings,
            userOpenTickets: openTickets,
            userUnreadNotifications: unread,
          }));
          setRecentActivity(activity);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, [admin, technician, currentUserId]);

  const summaryCards = useMemo(() => {
    if (admin) {
      return [
        {
          title: 'Pending Approvals',
          value: metrics.adminPendingBookings,
          subtitle: 'Bookings waiting admin decision',
          icon: ClipboardList,
          tone: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
        },
        {
          title: 'High Priority Tickets',
          value: metrics.adminHighPriorityOpenTickets,
          subtitle: 'OPEN and HIGH priority incidents',
          icon: Flame,
          tone: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-100 dark:border-rose-500/20' },
        },
        {
          title: 'Active Resources',
          value: metrics.adminActiveResources,
          subtitle: 'Resources currently bookable',
          icon: Package,
          tone: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
        },
      ];
    }
    if (technician) {
      return [
        {
          title: 'Assigned Tasks',
          value: metrics.technicianAssigned,
          subtitle: 'Total tickets assigned to you',
          icon: Briefcase,
          tone: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-100 dark:border-violet-500/20' },
        },
        {
          title: 'In Progress',
          value: metrics.technicianInProgress,
          subtitle: 'Tasks currently being worked',
          icon: Wrench,
          tone: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-100 dark:border-blue-500/20' },
        },
        {
          title: 'Overdue',
          value: metrics.technicianOverdue,
          subtitle: 'Open tasks older than 72 hours',
          icon: Clock3,
          tone: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
        },
      ];
    }
    return [
      {
        title: 'Upcoming Bookings',
        value: metrics.userUpcomingBookings,
        subtitle: 'PENDING/APPROVED future reservations',
        icon: CalendarDays,
        tone: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-100 dark:border-violet-500/20' },
      },
      {
        title: 'Open Tickets',
        value: metrics.userOpenTickets,
        subtitle: 'Incidents waiting resolution',
        icon: Ticket,
        tone: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
      },
      {
        title: 'Unread Notifications',
        value: metrics.userUnreadNotifications,
        subtitle: 'New updates in your workspace',
        icon: Bell,
        tone: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-100 dark:border-blue-500/20' },
      },
    ];
  }, [admin, technician, metrics]);

  const quickActions = useMemo(() => {
    if (admin) {
      return [
        { label: 'Approve Bookings', icon: ClipboardList, href: '/admin/bookings' },
        { label: 'Manage Resources', icon: Package, href: '/admin/resources' },
        { label: 'Manage Users', icon: Users, href: '/admin/users' },
      ];
    }
    if (technician) {
      return [
        { label: 'My Tasks', icon: Briefcase, href: '/technician/tasks' },
        { label: 'View Notifications', icon: Bell, href: '/notifications' },
        { label: 'Browse Resources', icon: BookOpen, href: '/resources' },
      ];
    }
    return [
      { label: 'New Booking', icon: CalendarDays, href: '/bookings/new' },
      { label: 'Report Incident', icon: Wrench, href: '/tickets/new' },
      { label: 'View Notifications', icon: Bell, href: '/notifications' },
    ];
  }, [admin, technician]);

  const attentionItems = useMemo(() => {
    if (admin) {
      const rows = [];
      if (metrics.adminPendingBookings > 10) {
        rows.push({
          title: 'Booking queue is growing',
          detail: `${metrics.adminPendingBookings} pending approvals require admin action.`,
          href: '/admin/bookings',
        });
      }
      if (metrics.adminHighPriorityOpenTickets > 0) {
        rows.push({
          title: 'High-priority incidents open',
          detail: `${metrics.adminHighPriorityOpenTickets} urgent tickets need assignment or updates.`,
          href: '/admin/tickets',
        });
      }
      if (metrics.adminOutOfServiceResources > 0) {
        rows.push({
          title: 'Resources out of service',
          detail: `${metrics.adminOutOfServiceResources} resources marked OUT_OF_SERVICE.`,
          href: '/admin/resources',
        });
      }
      return rows;
    }

    if (technician) {
      const rows = [];
      if (metrics.technicianOverdue > 0) {
        rows.push({
          title: 'Overdue tasks detected',
          detail: `${metrics.technicianOverdue} task(s) are older than 72 hours.`,
          href: '/technician/tasks',
        });
      }
      if (metrics.technicianInProgress > 0) {
        rows.push({
          title: 'In-progress tasks to close',
          detail: `${metrics.technicianInProgress} task(s) are currently in progress.`,
          href: '/technician/tasks',
        });
      }
      return rows;
    }

    const rows = [];
    if (metrics.userUnreadNotifications > 0) {
      rows.push({
        title: 'Unread updates available',
        detail: `${metrics.userUnreadNotifications} notification(s) need your review.`,
        href: '/notifications',
      });
    }
    if (metrics.userOpenTickets > 0) {
      rows.push({
        title: 'Open incidents in progress',
        detail: `${metrics.userOpenTickets} ticket(s) are still active.`,
        href: '/tickets',
      });
    }
    return rows;
  }, [admin, technician, metrics]);

  const routeForNotification = (item) => {
    if (!item) return '/notifications';
    if (item.referenceType === 'BOOKING') return item.type === 'BOOKING_CREATED' && admin ? '/admin/bookings' : `/bookings/${item.referenceId}`;
    if (item.referenceType === 'TICKET') return item.type === 'TICKET_CREATED' && admin ? '/admin/tickets' : `/tickets/${item.referenceId}`;
    if (item.referenceType === 'RESOURCE') return `/resources/${item.referenceId}`;
    return '/notifications';
  };

  return (
    <Layout title="Dashboard">
      <div className="space-y-8">
        <div className="rounded-3xl border border-violet-100 dark:border-violet-500/20 bg-linear-to-r from-violet-600/10 to-indigo-600/10 dark:from-violet-500/10 dark:to-indigo-500/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-500/30 bg-white/80 dark:bg-zinc-900/70 px-3 py-1 text-xs font-bold tracking-wide text-violet-700 dark:text-violet-300">
                <Shield size={13} />
                {roleLabel}
              </div>
              <h2 className="mt-3 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {admin ? 'Operations Command Center' : technician ? 'Technician Workspace' : `Welcome back, ${user?.name?.split(' ')[0] || 'Member'}`}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {admin
                  ? 'Monitor platform health, prioritize urgent incidents, and keep services running smoothly.'
                  : technician
                    ? 'Track assigned maintenance work, clear overdue tasks, and close incidents faster.'
                    : 'Manage your bookings, track tickets, and stay informed through real-time updates.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.href)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
                >
                  <action.icon size={16} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {attentionItems.length > 0 && (
          <div className="rounded-2xl border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/5 p-5">
            <SectionHeader title="Needs Attention" subtitle="Items that may require action soon." />
            <div className="grid gap-3 md:grid-cols-2">
              {attentionItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => navigate(item.href)}
                  className="text-left rounded-xl border border-amber-200 dark:border-amber-500/20 bg-white/80 dark:bg-zinc-900 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                      <p className="text-xs mt-1 text-zinc-600 dark:text-zinc-400">{item.detail}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionHeader title="At a Glance" subtitle="Live metrics for your current role." />
          <div className="grid gap-4 md:grid-cols-3">
            {summaryCards.map((card) => (
              <SummaryCard
                key={card.title}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                tone={card.tone}
                loading={loading}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm"
          >
            <SectionHeader title="Recent Activity" subtitle="Your latest 5 system updates." />
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No recent events yet. New booking/ticket updates will appear here.
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(routeForNotification(item))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{item.message || 'System update'}</p>
                      <span className="shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {String(item.type || 'update').replaceAll('_', ' ')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Motion.div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <SectionHeader title="Workspace Shortcuts" subtitle="Fast paths to key modules." />
            <div className="space-y-2">
              <button onClick={() => navigate('/dashboard')} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left text-sm font-semibold hover:border-violet-300 dark:hover:border-violet-600 transition-colors">Dashboard Overview</button>
              <button onClick={() => navigate('/resources')} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left text-sm font-semibold hover:border-violet-300 dark:hover:border-violet-600 transition-colors">Resources Catalogue</button>
              <button onClick={() => navigate('/bookings')} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left text-sm font-semibold hover:border-violet-300 dark:hover:border-violet-600 transition-colors">Bookings</button>
              <button onClick={() => navigate('/tickets')} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left text-sm font-semibold hover:border-violet-300 dark:hover:border-violet-600 transition-colors">Tickets</button>
              <button onClick={() => navigate('/notifications')} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left text-sm font-semibold hover:border-violet-300 dark:hover:border-violet-600 transition-colors">Notifications</button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4">
          <div className="flex flex-col gap-2 text-xs text-zinc-500 dark:text-zinc-400 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <LifeBuoy size={14} />
              <span>Smart Campus Operations Hub v1.0.0</span>
              <span className="hidden md:inline">•</span>
              <span>Build {new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/profile')} className="font-semibold hover:text-violet-600 dark:hover:text-violet-300 transition-colors inline-flex items-center gap-1"><UserRound size={12} /> Profile</button>
              <button onClick={() => navigate('/settings')} className="font-semibold hover:text-violet-600 dark:hover:text-violet-300 transition-colors">Contact Support</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
