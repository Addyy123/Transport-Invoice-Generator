import { useLocation } from 'react-router-dom';
import { Bell, Menu, UserCircle } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const location = useLocation();
  
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/create-invoice') return 'Create Invoice';
    if (location.pathname === '/customers') return 'Customers';
    if (location.pathname === '/profile') return 'Company Profile';
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname.startsWith('/invoice/')) return 'Invoice Preview';
    return '';
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onMenuClick} className="-m-2.5 p-2.5 text-slate-700 hover:bg-slate-100 rounded-full transition-colors lg:hidden">
          <span className="sr-only">Toggle sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 hidden lg:block tracking-tight">{getPageTitle()}</h1>
      </div>
      
      <div className="flex flex-1 items-center justify-end gap-4">
        <button className="text-slate-400 hover:text-slate-500">
          <span className="sr-only">View notifications</span>
          <Bell className="h-6 w-6" aria-hidden="true" />
        </button>
        
        <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
        
        <button className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900">
          <UserCircle className="h-8 w-8 text-slate-400" />
          <span className="hidden sm:block">Admin</span>
        </button>
      </div>
    </header>
  );
}
