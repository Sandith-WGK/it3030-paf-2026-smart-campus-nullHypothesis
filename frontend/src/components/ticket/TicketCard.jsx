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
      className="group relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 hover:border-violet-300 dark:hover:border-violet-700/50 overflow-hidden flex flex-col h-full"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="flex justify-between items-start mb-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${STATUS_COLORS[ticket.status] || 'bg-zinc-100 text-zinc-600'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            ticket.status === 'OPEN' ? 'bg-emerald-500' :
            ticket.status === 'IN_PROGRESS' ? 'bg-blue-500' :
            ticket.status === 'RESOLVED' ? 'bg-purple-500' :
            ticket.status === 'REJECTED' ? 'bg-red-500' : 'bg-zinc-400'
          }`}></span>
          {ticket.status?.replace('_', ' ')}
        </span>
        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${PRIORITY_COLORS[ticket.priority]}`}>
          {ticket.priority} PRIORITY
        </span>
      </div>
      
      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
        {ticket.category}
      </h3>
      
      <p className="text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-6">
        {ticket.description}
      </p>
      
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-500">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-zinc-400">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
          Details
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
