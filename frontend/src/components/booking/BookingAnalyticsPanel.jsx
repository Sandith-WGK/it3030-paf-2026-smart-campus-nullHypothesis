import React, { useEffect, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, Award, Clock, CalendarDays, Users } from 'lucide-react';
import bookingService from '../../services/api/bookingService';

const PALETTE = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
const STATUS_COLORS = {
  Approved: '#10b981',
  Rejected: '#ef4444',
  Cancelled: '#f59e0b',
  Pending: '#8b5cf6',
};

// Format hour as "8 AM", "14 PM" etc.
function fmtHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

// Small stat card
function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-900`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</p>
    </div>
  );
}

// Skeleton for loading state
function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-56 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-56 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-56 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-56 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.15)',
  fontSize: 12,
};

export default function BookingAnalyticsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    bookingService
      .getBookingAnalytics()
      .then((res) => {
        setData(res.data?.data ?? res.data);
      })
      .catch(() => setError('Failed to load analytics. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AnalyticsSkeleton />;
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }
  if (!data) return null;

  // Prepare pie chart data
  const statusData = [
    { name: 'Approved', value: data.approvedCount },
    { name: 'Rejected', value: data.rejectedCount },
    { name: 'Cancelled', value: data.cancelledCount },
    { name: 'Pending', value: data.pendingCount },
  ].filter((s) => s.value > 0);

  // Format peak hours for chart (fill all 24 hours for shape)
  const hourMapFull = Array.from({ length: 24 }, (_, h) => {
    const found = (data.peakHours ?? []).find((p) => p.hour === h);
    return { hour: fmtHour(h), count: found ? found.count : 0 };
  }).filter((_, i) => {
    // Only show hours 6 AM – 10 PM (indices 6-22) to keep chart readable
    return i >= 6 && i <= 22;
  });

  // Top resources for horizontal bar chart
  const topResources = (data.topResources ?? []).map((r) => ({
    name: r.resourceName.length > 20 ? r.resourceName.slice(0, 18) + '…' : r.resourceName,
    bookings: r.bookingCount,
  }));

  // Day-of-week
  const dowData = data.bookingsByDayOfWeek ?? [];

  return (
    <Motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-violet-500" />
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Booking Analytics
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
          Live data — {data.totalBookings} total bookings
        </div>
      </div>

      {/* ── Status KPI cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total" value={data.totalBookings} color="text-zinc-900 dark:text-zinc-100" />
        <StatCard label="Approved" value={data.approvedCount} color="text-green-600 dark:text-green-400" />
        <StatCard label="Pending" value={data.pendingCount} color="text-yellow-600 dark:text-yellow-400" />
        <StatCard label="Rejected" value={data.rejectedCount} color="text-red-600 dark:text-red-400" />
        <StatCard
          label="Approval Rate"
          value={`${data.approvalRate}%`}
          color="text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* ── Charts grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* 1 — Top 5 Resources (horizontal bar) */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Award size={14} className="text-violet-500" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              Top Resources
            </p>
          </div>
          {topResources.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                layout="vertical"
                data={topResources}
                margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f4f4f5' }} />
                <Bar dataKey="bookings" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 2 — Status Breakdown (donut) */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp size={14} className="text-green-500" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              Status Breakdown
            </p>
          </div>
          {statusData.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="42%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] ?? PALETTE[0]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 3 — Peak Booking Hours */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Clock size={14} className="text-amber-500" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              Peak Hours (6 AM – 10 PM)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourMapFull}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis
                dataKey="hour"
                stroke="#71717a"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                allowDecimals={false}
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#fef9c3' }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 4 — Bookings by Day of Week */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <CalendarDays size={14} className="text-sky-500" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              Bookings by Day of Week
            </p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis
                dataKey="day"
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f0f9ff' }} />
              <Bar dataKey="count" fill="#38bdf8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Top Users leaderboard ───────────────────────────────────────────── */}
      {data.topUsers && data.topUsers.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center gap-1.5 mb-4">
            <Users size={14} className="text-violet-500" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              Top Bookers
            </p>
          </div>
          <ol className="space-y-2">
            {data.topUsers.map((u, idx) => (
              <li key={u.userId} className="flex items-center gap-3">
                {/* Rank badge */}
                <span
                  className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                      : idx === 1
                      ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                      : idx === 2
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'
                  }`}
                >
                  {idx + 1}
                </span>

                {/* Name */}
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">
                  {u.userName}
                </span>

                {/* Bar + count */}
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (u.bookingCount / (data.topUsers[0]?.bookingCount || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-5 text-right">
                    {u.bookingCount}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Motion.div>
  );
}
