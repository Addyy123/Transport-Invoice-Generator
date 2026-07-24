import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, UserCircle, Building2, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useAuth } from '../AuthProvider';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user, signOut } = useAuth();

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/create-invoice') return 'Create Invoice';
    if (location.pathname === '/customers') return 'Customers';
    if (location.pathname === '/profile') return 'Company Profile';
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname.startsWith('/invoice/')) return 'Invoice Preview';
    if (location.pathname.startsWith('/edit-invoice/')) return 'Edit Invoice';
    return '';
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-6 relative z-30">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onMenuClick} className="-m-2.5 p-2.5 text-slate-700 hover:bg-slate-100 rounded-full transition-colors lg:hidden">
          <span className="sr-only">Toggle sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 hidden lg:block tracking-tight">{getPageTitle()}</h1>
      </div>
      
      <div className="flex flex-1 items-center justify-end gap-4 relative">
        
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full transition-colors ${showNotifications ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-500 hover:bg-slate-50'}`}
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">Notifications</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-sm text-slate-500">You're all caught up!</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
        
        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${showProfile ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
          >
            <UserCircle className="h-8 w-8 text-slate-400" />
            <span className="hidden sm:block text-sm font-medium text-slate-700">Admin</span>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 py-1">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <p className="text-sm font-medium text-slate-900">Administrator</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@local'}</p>
              </div>
              <button 
                onClick={() => { setShowProfile(false); navigate('/profile'); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Company Profile
              </button>
              <button 
                onClick={() => { setShowProfile(false); navigate('/settings'); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <SettingsIcon className="h-4 w-4" />
                App Settings
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button 
                onClick={async () => { 
                  setShowProfile(false); 
                  await signOut();
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
