import React, { useEffect, useState } from 'react';
import { ChevronsLeft, ChevronsRight, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from '../Navbar';

const DESKTOP_SIDEBAR_KEY = 'sc.sidebar.collapsed';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DESKTOP_SIDEBAR_KEY);
      if (saved === 'true') setDesktopSidebarCollapsed(true);
      if (saved === 'false') setDesktopSidebarCollapsed(false);
    } catch {
      // Ignore storage issues and keep default expanded state.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DESKTOP_SIDEBAR_KEY, String(desktopSidebarCollapsed));
    } catch {
      // Ignore storage issues.
    }
  }, [desktopSidebarCollapsed]);

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col">
      {/* Top header spans full width */}
      <Navbar
        leftSlot={
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden p-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <button
              className="hidden lg:inline-flex p-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white"
              onClick={() => setDesktopSidebarCollapsed((v) => !v)}
              aria-label={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {desktopSidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
          </div>
        }
      />

      {/* Body sits below header */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          open={sidebarOpen}
          collapsed={desktopSidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
