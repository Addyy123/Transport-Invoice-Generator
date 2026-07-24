import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Building2, 
  Settings,
  X,
  Menu
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Create Invoice', href: '/create-invoice', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Company Profile', href: '/profile', icon: Building2 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 flex h-full min-h-screen flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out lg:static lg:h-screen lg:shrink-0 ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:translate-x-0 lg:w-20'}`}>
        
        <div className={`flex h-16 shrink-0 items-center px-4 ${isOpen ? 'justify-between' : 'justify-center'}`}>
          <div className={`flex items-center gap-2 overflow-hidden ${isOpen ? '' : 'hidden'}`}>
            <FileText className="h-6 w-6 shrink-0 text-primary" />
            <span className="text-lg font-bold text-white truncate">Alex Logistics</span>
          </div>
          
          <button 
            className={`hidden lg:block text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-800 transition-colors ${isOpen ? '' : 'mx-auto'}`}
            onClick={() => setIsOpen(!isOpen)}
            title="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => {
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              className={({ isActive }) =>
                `flex items-center rounded-md transition-colors ${isOpen ? 'px-3 py-3' : 'px-0 py-3 justify-center'} ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
              title={!isOpen ? item.name : undefined}
            >
              <item.icon className={`${isOpen ? 'mr-3' : ''} h-5 w-5 shrink-0`} aria-hidden="true" />
              {isOpen && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800 shrink-0 text-center overflow-hidden">
          {isOpen ? (
            <p className="text-xs text-slate-500 whitespace-nowrap">Generator v1.0</p>
          ) : (
            <p className="text-[10px] text-slate-500">v1.0</p>
          )}
        </div>
      </div>
    </>
  );
}
