import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Ticket } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import TicketCard from '../../components/ticket/TicketCard';
import { ticketService } from '../../services/api/ticketService';
import Toast from '../../components/common/Toast';
import { SkeletonGrid } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await ticketService.getMyTickets();
      const raw = res.data ?? res;
      setTickets(Array.isArray(raw) ? raw : []);
    } catch  {
      setToast({ type: 'error', message: 'Failed to load tickets' });
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <Layout title="My Tickets">
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 dark:from-violet-900/20 dark:to-indigo-900/20 p-8 rounded-2xl border border-violet-100 dark:border-violet-900/30">
          <div>
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 tracking-tight">
              My Support Tickets
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2 font-medium">
              Track, manage, and review your maintenance and incident reports effortlessly.
            </p>
          </div>
          <button
            onClick={() => navigate('/tickets/new')}
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 font-bold transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-zinc-900/20 dark:shadow-white/10"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center gap-2 group-hover:text-white transition-colors">
              <Plus size={18} strokeWidth={3} />
              New Ticket
            </span>
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          className="appearance-none font-medium bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select 
          value={priorityFilter} 
          onChange={e => setPriorityFilter(e.target.value)}
          className="appearance-none font-medium bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all cursor-pointer"
        >
          <option value="ALL">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : filteredTickets.length === 0 ? (
        <div className="py-16">
          <EmptyState
            icon={Ticket}
            title="No tickets found"
            message="You have no tickets matching these filters. Everything looks clear!"
            action={
              <button 
                onClick={() => navigate('/tickets/new')} 
                className="mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-indigo-600 hover:to-violet-600 text-white text-sm font-bold px-8 py-3 shadow-lg shadow-violet-500/30 transition-all hover:scale-105"
              >
                Submit a Ticket
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTickets.map(ticket => (
            <div key={ticket.id} className="transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-2xl">
              <TicketCard ticket={ticket} />
            </div>
          ))}
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
