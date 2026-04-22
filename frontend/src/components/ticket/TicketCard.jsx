import React from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
  OPEN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  RESOLVED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  CLOSED: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const PRIORITY_COLORS = {
  LOW: 'text-zinc-500',
  MEDIUM: 'text-amber-500',
  HIGH: 'text-red-500'
};

export default function TicketCard({ ticket }) {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] || 'bg-zinc-100'}`}>
          {ticket.status?.replace('_', ' ')}
        </span>
        <span className={`text-xs font-semibold ${PRIORITY_COLORS[ticket.priority]}`}>
          {ticket.priority} PRIORITY
        </span>
      </div>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1 line-clamp-1">{ticket.category}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">{ticket.description}</p>
      
      <div className="text-xs text-zinc-400 flex items-center justify-between">
        <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
