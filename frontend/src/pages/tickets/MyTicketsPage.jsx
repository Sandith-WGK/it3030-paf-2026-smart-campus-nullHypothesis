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
    } catch (_) {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Tickets</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Manage your incident and maintenance reports</p>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          <Plus size={16} />
          New Ticket
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
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
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
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
        <EmptyState
          icon={Ticket}
          title="No tickets found"
          message="You have no tickets matching these filters."
          action={
            <button onClick={() => navigate('/tickets/new')} className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5">
              Submit a Ticket
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
