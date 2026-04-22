import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from '../Navbar';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col">
      {/* Top header spans full width */}
      <Navbar
        leftSlot={
          <button
            className="lg:hidden p-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
        }
      />

      {/* Body sits below header */}
      <div className="flex flex-1 min-h-0">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 min-w-0 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
