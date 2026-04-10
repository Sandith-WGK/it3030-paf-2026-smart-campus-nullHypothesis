import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Layout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <button
            className="lg:hidden p-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          {title && (
            <h1 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              {title}
            </h1>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
