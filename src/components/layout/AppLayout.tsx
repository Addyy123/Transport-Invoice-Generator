import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useKeyboardShortcuts } from '../../lib/useKeyboardShortcuts';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  useKeyboardShortcuts();

  // Close sidebar on mobile when resizing, but only when crossing the breakpoint
  useEffect(() => {
    let wasMobile = window.innerWidth < 1024;
    
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile !== wasMobile) {
        setSidebarOpen(!isMobile);
        wasMobile = isMobile;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background text-foreground transition-colors duration-200 overflow-hidden print:bg-white print:h-auto print:overflow-visible print:block">
      <div className="print:hidden h-full">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden w-full print:overflow-visible print:block">
        <div className="print:hidden">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0 print:block">
          <div className="w-full h-full print:h-auto print:max-w-none print:block">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
