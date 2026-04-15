import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { motion as Motion } from 'framer-motion';
import { CalendarDays, Wrench, Bell, LayoutGrid } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { isAdmin } from '../utils/auth';

const cards = [
  {
    title: 'My Bookings',
    description: 'View and manage your upcoming reservations for halls, labs, and equipment.',
    icon: CalendarDays,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-100 dark:border-violet-500/20',
    btnClass:
      'text-violet-600 bg-violet-50 hover:bg-violet-100 dark:text-violet-300 dark:bg-violet-500/10 dark:hover:bg-violet-500/20',
    btnLabel: 'View Bookings',
    href: '/bookings',
  },
  {
    title: 'Maintenance Tickets',
    description: 'Report issues with equipment or facilities, or track existing tickets.',
    icon: Wrench,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-100 dark:border-amber-500/20',
    btnClass:
      'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-500/10 dark:hover:bg-amber-500/20',
    btnLabel: 'Open Tickets',
    href: '/tickets',
  },
  {
    title: 'Notifications',
    description: 'Check recent updates for your tickets and booking requests.',
    icon: Bell,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-100 dark:border-blue-500/20',
    btnClass:
      'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-500/10 dark:hover:bg-blue-500/20',
    btnLabel: 'Check Alerts',
    href: '/notifications',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const admin = isAdmin();

  return (
    <Layout title="Dashboard">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Welcome back 👋</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
          Here's a quick overview of your Smart Campus activity.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => (
          <Motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`rounded-2xl border ${card.border} bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className={`inline-flex rounded-xl ${card.bg} p-3 mb-4`}>
              <card.icon size={22} className={card.color} />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
              {card.title}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
              {card.description}
            </p>
            <button
              onClick={() => navigate(card.href)}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${card.btnClass}`}
            >
              {card.btnLabel}
            </button>
          </Motion.div>
        ))}

        {admin && (
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: cards.length * 0.07 }}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-3 mb-4">
              <LayoutGrid size={22} className="text-zinc-600 dark:text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
              Admin Panel
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
              Approve or reject booking requests and manage campus resources.
            </p>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="text-sm font-semibold px-4 py-2 rounded-lg text-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
            >
              Manage Bookings
            </button>
          </Motion.div>
        )}
      </div>
    </Layout>
  );
}
